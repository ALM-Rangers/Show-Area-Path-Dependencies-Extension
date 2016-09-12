
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
import WorkRestClient = require("TFS/Work/RestClient");
import Contracts = require("TFS/Core/Contracts");
import WorkItemRestClient = require("TFS/WorkItemTracking/RestClient");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemServices = require("TFS/WorkItemTracking/Services");
import CoreRestClient = require("TFS/Core/RestClient");
import StatusIndicator = require("VSS/Controls/StatusIndicator");

export class DependencyTracker {

    public GridSource: any;
    public Grid: Grids.Grid;
    public RelationTypes: HashTable = {};
    public TelemtryClient = TelemetryClient.getClient();

    constructor() {
    }

    public buildGrid() {

        var me = this;
        var container = $("#container");
        var context = VSS.getWebContext();

        this.TelemtryClient.trackEvent("buildGrid");

        var loadTimer = new StopWatch();
        loadTimer.Start();

        var waitControl = me.BuildWaitControl(container);

        waitControl.startWait();

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



        me.LoadWorkItemRelationTypes().then(links => {
            me.RelationTypes = links;
            me.LoadWorkItemDetails(context).then(workItemTypes => {
                me.LoadPaths(context).then(paths => {
                    me.QueryBacklog(context, paths, workItemTypes).then(data => {

                        if (data) {
                            //Create the grid in a container element
                            me.Grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, container, options);

                            var gridSource = me.BuildGridSource(data.workItems, data.relations, paths);
                            me.Grid.setDataSource(new Grids.GridHierarchySource(gridSource));
                        } else {
                            container.text("It appears that you backlog is empty!");
                        }
                        waitControl.endWait();

                        loadTimer.Stop();
                        this.TelemtryClient.trackMetric("Load_Duration", loadTimer.GetDurationInMilliseconds());

                    });
                });
            });
        });
    }

    public GetFormattedTitle(column: Grids.IGridColumn, dataIndex: number, level: number, indentIndex: number) {
        var rowData = this.Grid.getRowData(dataIndex);

        var gridCell = $("<div class='grid-cell'/>").width(column.width);

        var decorator = $("<div class='work-item-color' />")
            .text(" ");

        if (rowData["owned"]) {
            decorator.css("background-color", WitdColourHelper.ResolveColour(rowData["System.WorkItemType"]))
        } else {
            decorator.addClass("unowned").css("border-color", WitdColourHelper.ResolveColour(rowData["System.WorkItemType"]))
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

    public LoadPaths(context: WebContext): IPromise<AreaPathConfiguration[]> {

        var defer = $.Deferred<AreaPathConfiguration[]>();
        //setup search team context
        var teamContext: Contracts.TeamContext = {
            project: context.project.name,
            projectId: context.project.id,
            team: context.team.name,
            teamId: context.team.id
        };

        //create work client
        var client = WorkRestClient.getClient();

        //query the area paths
        client.getTeamFieldValues(teamContext).then((settings) => {
            var areaPaths = new Array<AreaPathConfiguration>();
            settings.values.forEach(item => {
                areaPaths.push({ Path: item.value, IncludeChildren: item.includeChildren });
            });
            defer.resolve(areaPaths);
        });

        return defer.promise();

    }

    public LoadWorkItemDetails(context: WebContext): IPromise<string[]> {
        var timer = new StopWatch();
        timer.Start();

        var me = this;
        var defer = $.Deferred<string[]>();

        var coreClient = WorkItemRestClient.getClient();

        coreClient.getWorkItemTypeCategories(context.project.name).then(categories => {
            var requirementCategory = categories.filter((wtc, index, categories) => { return wtc.referenceName === ConfigSettings.RequirementCategory })[0];

            var workItemTypes = me.BuildWorkItemList(requirementCategory);

            defer.resolve(workItemTypes);
            timer.Stop();
            this.TelemtryClient.trackMetric("LoadWorkItemDetails", timer.GetDurationInMilliseconds());
        }, err => {
            var s = err;
            this.TelemtryClient.trackException(err, "coreClient.getWorkItemTypeCategories");
        });

        return defer.promise();

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

    public BuildWorkItemList(requirementCategory: WorkItemContracts.WorkItemTypeCategory): Array<string> {
        var requirementTypes = new Array<string>();
        requirementCategory.workItemTypes.forEach(workItem => { requirementTypes.push(workItem.name) });

        if (ConfigSettings.IncludeBug) {
            //if bug does not exist - add it...
            if (requirementTypes.indexOf(ConfigSettings.BugTypeName) < 0) {
                requirementTypes.push(ConfigSettings.BugTypeName);
            }
        }

        return requirementTypes;
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

            gridSource.push(rootItem);
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
