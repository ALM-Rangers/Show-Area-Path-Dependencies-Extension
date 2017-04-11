// ---------------------------------------------------------------------
// <copyright file="DependencyTracker.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Main logic for the DependencyTracker Extension</summary>
// ---------------------------------------------------------------------

/// <reference path="../typings/tsd.d.ts" />
/// <reference path="Configuration.ts" />

"use strict";
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");

import WorkItemRestClient = require("TFS/WorkItemTracking/RestClient");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemServices = require("TFS/WorkItemTracking/Services");

import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");

import DataService = require("./DataService");
import Config = require("./ConfigurationDialog");
import UIService = require("./UIService");

export class DependencyTracker {
    static WaitControlID = "dependencymodelwaitcontrol";

    public GridSource: any;
    public Grid: Grids.Grid;
    public RelationTypes: HashTable = {};
    public TelemtryClient = TelemetryClient.getClient();
    public MenuBar: Menus.MenuBar;

    public container = $("#container");
    public menubar = $("#toolbar");
    public pivotbar = $("#filter-container");

    public DataService: DataService.DataService;
    public Context: WebContext;

    public Settings: IDependancySettings;

    constructor() {
        this.DataService = new DataService.DataService();
    }

    public buildGrid() {

        var me = this;

        this.Context = VSS.getWebContext();

        this.TelemtryClient.trackEvent("buildGrid");

        var control = UIService.UIService.GetWaitControl(DependencyTracker.WaitControlID, me.container);

        control.startWait();

        this.DataService.LoadSettings(this.Context).then(settings => {
            this.Settings = settings;
            this.DataService.FindAllRelationTypes().then(relations => {
                me.RelationTypes = relations;

                me.BuildMenu(me.menubar);
                me.BuildPivotOptions(me.pivotbar);

                me.LoadData(me.container, this.Context);
            });
        });
    }


    public LoadData(container: JQuery, context: WebContext) {
        var me = this;
        var waitControl = UIService.UIService.GetWaitControl(DependencyTracker.WaitControlID, me.container);
        waitControl.startWait();
        var loadTimer = new StopWatch();
        loadTimer.Start();

        waitControl.setMessage("Loading work item types...");
        me.DataService.GetWorkItemTypes(context).then(workItemTypes => {
            waitControl.setMessage("Loading area paths...");
            me.DataService.GetAreaPaths(context).then(paths => {
                waitControl.setMessage("Loading backlog");
                me.QueryBacklog(context, paths, workItemTypes).then(data => {

                    if (data) {
                        waitControl.setMessage("Populating grid");
                        me.PopulateGrid(container, data, paths);
                    } else {
                        container.text("It appears that you backlog is empty or has no items to display!");
                    }
                    waitControl.endWait();

                    loadTimer.Stop();
                    me.TelemtryClient.trackMetric("Load_Duration", loadTimer.GetDurationInMilliseconds());

                },
                    rej => {
                        me.TelemtryClient.trackException(rej, "DependencyTracker.LoadData");
                        waitControl.endWait();
                    });
            });
        });
    }

    public GetGridColumns(fields: ColumnDefinition[]): Grids.IGridColumn[] {

        var me = this;

        var sorted = fields.sort((a: ColumnDefinition, b: ColumnDefinition) => {
            return a.order - b.order;
        });

        var columns = [];

        sorted.forEach(col => {
            var definition: any = { text: col.name, width: col.width, index: col.refname };

            if (col.refname == "System.AreaPath") {
                definition.canSortBy = false;
            }
            if (col.refname == "System.Title") {
                definition.getCellContents = (rowInfo: Grids.IGridRowInfo, dataIndex: number, expandedState: number, level: number, column: Grids.IGridColumn, indentIndex: number, columnOrder: number) => { return me.GetFormattedTitle(column, dataIndex, level, indentIndex); };
            }

            columns.push(definition);
        });
  
        columns.push({ text: "Relation", width: 100, index: "System.LinkName" });

        return columns;
    }

    public PopulateGrid(container: JQuery, data: any, paths: AreaPathConfiguration[]) {
        var me = this;

        var columns = me.GetGridColumns(me.Settings.Fields);
        if (me.Grid) {
            me.Grid.dispose();
        }

        var screenHeight = (screen.availHeight * 0.75) + "px";
        var options: Grids.IGridOptions = {
            height: screenHeight,
            width: "100%",
            columns: columns
            , openRowDetail: (index: number) => {
                var workItem = me.Grid.getRowData(index);
                WorkItemServices.WorkItemFormNavigationService.getService().then(service => {
                    service.openWorkItem(workItem.id, false);
                });
            }
        };

        // Create the grid in a container element
        me.Grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, container, options);
        var gridSource = me.BuildGridSource(data.workItems, data.relations, paths);
        me.Grid.setDataSource(new Grids.GridHierarchySource(gridSource));

    }

    public BuildPivotOptions(pivotContainer: JQuery) {

        this.CreateDependenciesFilter(pivotContainer);
        // TODO: Maybe in teh next update
        // this.CreateQueryAcrossProjects(pivotContainer);
    }

    public CreateDependenciesFilter(pivotContainer: JQuery) {
        var actual = this.Settings.ShowEmpty;
        var me = this;
        var pivotFilterOptions: Navigation.IPivotFilterOptions = {
            behavior: "toggle",
            text: "Show items without dependencies: ",
            items: [
                { id: "show-yes", text: "yes", value: "Yes", selected: actual },
                { id: "show-no", text: "no", value: "No", selected: !actual }
            ],
            change: (item) => {

                if (item.value == "Yes") {
                    me.Settings.ShowEmpty = true;
                } else {
                    me.Settings.ShowEmpty = false;
                }
                me.DataService.SaveSettings(me.Context, me.Settings);
                me.LoadData(me.container, me.Context);
            }
        };

        return Controls.create<Navigation.PivotFilter, any>(Navigation.PivotFilter, pivotContainer, pivotFilterOptions);
    }

    public CreateQueryAcrossProjects(pivotContainer: JQuery) {
        var actual = false;

        var pivotFilterOptions: Navigation.IPivotFilterOptions = {
            behavior: "check",
            text: "Query across projects: ",
            items: [
                { id: "show-yes", text: "yes", value: "Yes", selected: actual },
                { id: "show-no", text: "no", value: "No", selected: !actual }
            ],
            change: (item) => {
                if (item.value == "Yes") {
                    alert("Yes");
                } else {
                    alert("No");
                }
            }
        };

        return Controls.create<Navigation.PivotFilter, any>(Navigation.PivotFilter, pivotContainer, pivotFilterOptions);
    }

    public BuildMenu(toolbar: any): Menus.MenuBar {
        var me = this;

        var menuOptions: Menus.MenuBarOptions = {
            orientation: "horizontal",
            showIcon: true,
            items: [
                { id: "refresh-items", title: "Refresh", icon: "icon-refresh", showText: false, groupId: "icon" },
                { id: "expand-items", title: "Expand", icon: "icon-tree-expand-all", showText: false, groupId: "icon1" },
                { id: "collapse-items", title: "Collapse", icon: "icon-tree-collapse-all", showText: false, groupId: "icon1" },
                { id: "select-columns", text: "Column Options", title: "Column Options", showText: true, noIcon: true, disabled: false, groupId: "text" },
            ],
            executeAction: (args) => {
                var d = args.get_commandName();

                switch (d) {
                    case "refresh-items":
                        me.LoadData(me.container, this.Context);
                        break;
                    case "collapse-items":
                        me.Grid.collapseAll();
                        break;
                    case "expand-items":
                        me.Grid.expandAll();
                        break;
                    case "select-columns":
                        me.SelectColumns();
                        break;
                }
            }

        };

        // Create the menubar in a container element
        return Controls.create<Menus.MenuBar, any>(Menus.MenuBar, toolbar, menuOptions);
    }

    public SelectColumns(): void {
        var me = this;
        VSS.getService(VSS.ServiceIds.Dialog).then((dialogService: IHostDialogService) => {
            var extensionContext = VSS.getExtensionContext();

            // Build absolute contribution ID for dialogContent
            var contributionId = extensionContext.publisherId + "." + extensionContext.extensionId + ".configuration";
            var dialogModel: Config.ConfigurationDialogModel;

            // Show dialog
            var dialogOptions: IHostDialogOptions = {
                title: "Column Options",
                width: 560,
                height: 400,
                getDialogResult: () => {
                    return dialogModel.GetFieldSelection();
                },
                okCallback: (result: ColumnDefinition[]) => {
                    if (dialogModel != null) {

                        me.Settings.Fields = result;
                        me.DataService.SaveSettings(me.Context, me.Settings);
                        me.LoadData(me.container, me.Context);

                    }
                }
            };

            dialogService.openDialog(contributionId, dialogOptions).then(dialog => {
                dialog.getContributionInstance("configuration").then((instance: Config.ConfigurationDialogModel) => {
                    instance.SetDataService(me.DataService);
                    instance.SetSettings(me.Settings);
                    instance.Load(me.Context);

                    dialogModel = instance;

                    dialog.updateOkButton(true);
                });
            });
        });
    }

    public GetFormattedTitle(column: Grids.IGridColumn, dataIndex: number, level: number, indentIndex: number): JQuery {
        var me = this;
        var rowData = me.Grid.getRowData(dataIndex);

        var gridCell = $("<div class='grid-cell'/>").width(column.width);

        var decorator = $("<div class='work-item-color' />").text(" ");

        if (rowData["owned"]) {
            decorator.css("background-color", WitdColourHelper.ResolveColour(rowData["System.WorkItemType"]));
        } else {
            decorator.addClass("unowned").css("border-color", WitdColourHelper.ResolveColour(rowData["System.WorkItemType"]));
        }

        gridCell.css("text-indent", (32 * level) + "px");

        var titleHref = $("<a>");
        titleHref.on("click", () => {
            var wait = UIService.UIService.GetWaitControl(DependencyTracker.WaitControlID, me.container);
            wait.startWait();
            WorkItemServices.WorkItemFormNavigationService.getService().then(service => {
                service.openWorkItem(rowData["id"], false);

                wait.endWait();
            }, err => {
                wait.endWait();
            });
        });

        titleHref.text(rowData["System.Title"]);
        var titleText = $("<div style='display:inline' />").add(titleHref);


        gridCell.append(decorator);
        gridCell.append(titleText);

        return gridCell;
    }
    
    public LoadWorkItemStates(context: WebContext, callBack: Action<string[]>) {
        // TODO: should we dig around or just hard code ?
        // !Done !Removed
    }
    
    public LoadWorkItemRelationTypes(): IPromise<HashTable> {
        var defer = $.Deferred<HashTable>();
        var client = WorkItemRestClient.getClient();
        client.getRelationTypes().then(types => {

            var relationTypes: HashTable = {};
            types.forEach(type => {
                relationTypes[type.referenceName] = type.name;
            });

            defer.resolve(relationTypes);
        });
        return defer.promise();
    }

    public QueryBacklog(contex: WebContext, areaPaths: AreaPathConfiguration[], backlogTypes: string[]): IPromise<any> {

        var defer = $.Deferred<any>();

        // create work client
        var client = WorkItemRestClient.getClient();

        var qry: WorkItemContracts.Wiql = {
            query: ""
        };

        var states = ["New", "Approved", "Committed", "Active"];

        qry.query = WiqlHelper.CreateBacklogWiql(areaPaths, backlogTypes, states, this.Settings.Fields);

        client.queryByWiql(qry, contex.project.name).then(backlogIds => {
            var backlog = new Array<number>();

            backlogIds.workItems.forEach(workItem => {
                if (backlog.indexOf(workItem.id) < 0) {
                    backlog.push(workItem.id);
                }
            });

            if (backlog.length <= 0) {
                defer.resolve(null);
            } else {

                var loadSpecs = new Array<IPromise<any>>();
                var spliceSize = 75;
                var backlogSection = backlog.splice(0, spliceSize);
                while (backlogSection.length > 0) {

                    loadSpecs.push(this.GetWorkItemDetails(backlogSection, backlogIds.asOf));

                    var backlogSection = backlog.splice(0, spliceSize);
                }

                Q.all(loadSpecs).done(all => {

                    var workItems = [];
                    var relations = [];

                    all.forEach(resultItem => {
                        workItems = workItems.concat(resultItem.workItems);
                        relations = relations.concat(resultItem.relations);
                    });

                    var result = {
                        workItems: workItems,
                        relations: relations.filter(i => { return i !== null; })
                    };

                    defer.resolve(result);
                }, rejectReason => {
                    this.TelemtryClient.trackException(rejectReason, "DependencyTracker.QueryBacklog.QAll");
                    defer.reject(rejectReason);
                });
            }
        }, rej => {
            this.TelemtryClient.trackException(rej, "DependencyTracker.QueryBacklog.queryByWiql");
            defer.reject(rej);
        });

        return defer.promise();
    }

    public GetWorkItemDetails(backlogItems: number[], asOf: Date): IPromise<any> {

        var client = WorkItemRestClient.getClient();

        var defer = $.Deferred<any>();

        client.getWorkItems(backlogItems, null, asOf, WorkItemContracts.WorkItemExpand.Relations).then(backlogWorkItems => {
            // get relation id's
            var relations = new Array<number>();

            backlogWorkItems.forEach((backlogItem, idx, arr) => {
                if (backlogItem.relations) {
                    backlogItem.relations.forEach(relation => {
                        if (ConfigSettings.RelationTypes.indexOf(relation.rel) >= 0) {
                            relations.push(RelationHelper.FindIDFromLink(relation.url));
                        }
                    });
                }
            });

            if (relations.length > 0) {

                client.getWorkItems(relations, null, asOf, WorkItemContracts.WorkItemExpand.Relations).then(backlogRelations => {

                    var result = {
                        workItems: backlogWorkItems,
                        relations: backlogRelations
                    };

                    defer.resolve(result);
                });

            } else {

                var result = {
                    workItems: backlogWorkItems,
                    relations: null
                };

                defer.resolve(result);
            }
        }, err => {
            this.TelemtryClient.trackException(err, "DependencyTracker.GetWorkItemDetails.getWorkItems");
            defer.reject(err);
        });

        return defer;
    }

    public BuildGridSource(backlogItems: WorkItemContracts.WorkItem[], relations: WorkItemContracts.WorkItem[], paths: AreaPathConfiguration[]): Grids.IGridHierarchyItem[] {
        var gridSource = new Array<Grids.IGridHierarchyItem>();
        var me = this;
        backlogItems.forEach(workItem => {

            var rootItem = {
                values: me.PopulateFields(workItem, paths),
                children: new Array<Grids.IGridHierarchyItem>(),
                collapsed: false
            };

            if (relations && workItem.relations) {
                workItem.relations.forEach(relation => {
                    if (ConfigSettings.RelationTypes.indexOf(relation.rel) >= 0) {
                        var child = relations.filter(relationItem => { return relationItem.id == RelationHelper.FindIDFromLink(relation.url); })[0];
                        var childValues = me.PopulateFields(child, paths);
                        childValues["System.LinkName"] = me.RelationTypes[relation.rel];
                        rootItem.children.push({
                            values: childValues,
                            children: null,
                            collapsed: true
                        });
                    }
                });
            }

            if (me.Settings.ShowEmpty || rootItem.children.length > 0) {
                gridSource.push(rootItem);
            }
        });

        return gridSource;
    }

    public PopulateFields(workItem: WorkItemContracts.WorkItem, paths: AreaPathConfiguration[]): any[] {
        var values: any[] = [];

        this.Settings.Fields.forEach(field => {
            values[field.refname] = workItem.fields[field.refname];
        });

        // additional values to keep around
        values["url"] = workItem.url;
        values["id"] = workItem.id;

        values["owned"] = this.IsInPath(workItem.fields["System.AreaPath"], paths);

        return values;
    }

    public IsInPath(workItemPath: string, paths: AreaPathConfiguration[]): boolean {
        var found = paths.filter(areaPath => {

            if (areaPath.IncludeChildren) {
                return workItemPath.indexOf(areaPath.Path) >= 0;
            } else {
                return workItemPath == areaPath.Path;
            }
        });

        return found.length > 0;
    }
}
