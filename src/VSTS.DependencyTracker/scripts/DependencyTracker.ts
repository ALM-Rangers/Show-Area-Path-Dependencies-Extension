//---------------------------------------------------------------------
// <copyright file="DependencyTracker.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Main logic for the DependencyTracker Extension</summary>
//---------------------------------------------------------------------

/// <reference path="../typings/tsd.d.ts" />
/// <reference path="Configuration.ts" />
"use strict";
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");

import WorkItemRestClient = require("TFS/WorkItemTracking/RestClient");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemServices = require("TFS/WorkItemTracking/Services");
import CoreRestClient = require("TFS/Core/RestClient");
import StatusIndicator = require("VSS/Controls/StatusIndicator");

import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");

import DataService = require("./DataService");

export class DependencyTracker {

    public GridSource: any;
    public Grid: Grids.Grid;
    public RelationTypes: HashTable = {};
    public TelemtryClient = TelemetryClient.getClient();
    public MenuBar: Menus.MenuBar;
    public WaitControl: StatusIndicator.WaitControl;

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

        me.WaitControl = me.BuildWaitControl(me.container);

        me.WaitControl.startWait();

        this.DataService.LoadSettings(this.Context).then(settings => {
            this.Settings = settings;
            this.DataService.FindAllRelationTypes().then(relations => {
                me.RelationTypes = relations;

                var men = me.BuildMenu(me.menubar);
                me.BuildPivotOptions(me.pivotbar);

                me.LoadData(me.container, this.Context);
            });
        });

        me.WaitControl.endWait();

    }


    public LoadData(container, context: WebContext) {
        var me = this;

        var loadTimer = new StopWatch();
        loadTimer.Start();

        me.DataService.GetWorkItemTypes(context).then(workItemTypes => {
            me.DataService.GetAreaPaths(context).then(paths => {
                me.QueryBacklog(context, paths, workItemTypes).then(data => {

                    if (data) {

                        me.PopulateGrid(container, data, paths);

                    } else {
                        container.text("It appears that you backlog is empty or has no items to display!");
                    }
                    me.WaitControl.endWait();

                    loadTimer.Stop();
                    me.TelemtryClient.trackMetric("Load_Duration", loadTimer.GetDurationInMilliseconds());

                },
                    rej => {
                        alert(rej);
                        me.WaitControl.endWait();
                    });
            });
        });
    }

    public PopulateGrid(container: any, data: any, paths: AreaPathConfiguration[]) {
        var me = this;

        if (!me.Grid) {
            var screenHeight = (screen.availHeight * 0.75) + "px";
            var options: Grids.IGridOptions = {
                height: screenHeight,
                width: "100%",
                columns: [
                    { text: "Area Path", width: 200, index: "System.AreaPath", canSortBy: false },
                    { text: "Work Item Type", width: 200, index: "System.WorkItemType" },
                    { text: "Title", width: 400, index: "System.Title", getCellContents: (rowInfo: Grids.IGridRowInfo, dataIndex: number, expandedState: number, level: number, column: Grids.IGridColumn, indentIndex: number, columnOrder: number) => { return me.GetFormattedTitle(column, dataIndex, level, indentIndex); } },
                    { text: "State", width: 100, index: "System.State" },
                    { text: "Iteration Path", width: 200, index: "System.IterationPath" },
                    { text: "Link", width: 200, index: "System.LinkName" },
                ],
                openRowDetail: (index: number) => {
                    var workItem = me.Grid.getRowData(index);
                    var workItemService = WorkItemServices.WorkItemFormNavigationService.getService().then(service => {
                        service.openWorkItem(workItem.id, false);
                    });

                }

            };

            //Create the grid in a container element
            me.Grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, container, options);
        }
        var gridSource = me.BuildGridSource(data.workItems, data.relations, paths);
        me.Grid.setDataSource(new Grids.GridHierarchySource(gridSource));
    }

    public BuildPivotOptions(pivotContainer) {

        this.CreateDependenciesFilter(pivotContainer);
        //this.CreateQueryAcrossProjects(pivotContainer);
    }

    public CreateDependenciesFilter(pivotContainer) {
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
                }
                else {
                    me.Settings.ShowEmpty = false;
                }
                me.DataService.SaveSettings(me.Context, me.Settings);
            }
        };

        return Controls.create<Navigation.PivotFilter, any>(Navigation.PivotFilter, pivotContainer, pivotFilterOptions);
    }

    public CreateQueryAcrossProjects(pivotContainer) {
        var actual = false;

        var pivotFilterOptions: Navigation.IPivotFilterOptions = {
            behavior: "check",
            text: "Query across projects: ",
            items: [
                { id: "show-yes", text: "yes", value: "Yes", selected: actual },
                { id: "show-no", text: "no", value: "No", selected: !actual }
            ],
            change: function (item) {
                if (item.value == "Yes") {
                    alert("Yes");
                }
                else {
                    alert("No");
                }
            }
        };

        return Controls.create<Navigation.PivotFilter, any>(Navigation.PivotFilter, pivotContainer, pivotFilterOptions);
    }

    public BuildMenu(toolbar: any): Menus.MenuBar {
        var me = this;

        //{
        //    id: "filter.deps",
        //        title: "Filter Dependencies",
        //            icon: "icon-settings",
        //                separator: false,
        //                    disabled: false,
        //                        showText: false,

        //        //showHtml: false
        //    },

        var menuOptions: Menus.MenuBarOptions = {
            orientation: "horizontal",
            showIcon: true,
            items: [
                { id: "refresh-items", title: "Refresh", icon: "icon-refresh", showText: false, groupId: "icon" },
                { id: "select-columns", text: "Column Options", title: "Column Options", showText: true, noIcon: true, disabled: true, groupId: "text" },
                //{ id: "stop-items", text: "Stop", title: "Stop", showText: true, noIcon: true, disabled: true, groupId: "text" },
                //{ id: "help-items", text: "Help", title: "Help", showText: true, noIcon: true, groupId: "text" }
            ],
            executeAction: (args) => {
                var d = args.get_commandName();

                switch (d) {
                    case "refresh-items":
                        me.LoadData(me.container, this.Context);
                        break;
                }
                var item = this.MenuBar.getItem(d);

                item.toggleIsPinned(true, {
                    unfocus: true
                });

            }
        };


        // Create the menubar in a container element
        return Controls.create<Menus.MenuBar, any>(Menus.MenuBar, toolbar, menuOptions);
    }

    public GetFormattedTitle(column: Grids.IGridColumn, dataIndex: number, level: number, indentIndex: number) {
        var rowData = this.Grid.getRowData(dataIndex);

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
            var wait = this.BuildWaitControl($("#container"));
            wait.startWait();
            var workItemService = WorkItemServices.WorkItemFormNavigationService.getService().then(service => {
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


    public BuildWaitControl(container): StatusIndicator.WaitControl {

        var waitControlOptions: StatusIndicator.IWaitControlOptions = {
            cancellable: false,
            message: "Loading...",
            fade: true
        };

        return Controls.create(StatusIndicator.WaitControl, container, waitControlOptions);
    }


    public LoadWorkItemStates(context: WebContext, callBack: Action<string[]>) {
        //should we dig around or just hard code ?
        //!Done !Removed
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
        var me = this;

        //create work client
        var client = WorkItemRestClient.getClient();

        var qry: WorkItemContracts.Wiql = {
            query: ""
        };

        var states = ['New', 'Approved', 'Committed'];

        qry.query = WiqlHelper.CreateBacklogWiql(areaPaths, backlogTypes, states);


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
                    this.TelemtryClient.trackException(rejectReason, "QueryBacklog");
                    defer.reject(rejectReason);
                });
            }
        }, rej => {
            alert(rej);
        });

        return defer.promise();
    }

    public GetWorkItemDetails(backlogItems: number[], asOf: Date): IPromise<any> {

        var client = WorkItemRestClient.getClient();

        var defer = $.Deferred<any>();

        client.getWorkItems(backlogItems, null, asOf, WorkItemContracts.WorkItemExpand.Relations).then(backlogWorkItems => {
            //get relation id's
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
            var s = err;
            this.TelemtryClient.trackException(err, "coreClient.getWorkItems");
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

        ConfigSettings.FieldList.forEach(field => {
            var sanitizedField = field.replace("[", "").replace("]", "");
            values[sanitizedField] = workItem.fields[sanitizedField];
        });

        //additional values to keep around
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
