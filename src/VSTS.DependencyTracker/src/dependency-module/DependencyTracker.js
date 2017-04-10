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
"use strict";
/// <reference path="../types/types.d.ts" />
var Controls = require("VSS/Controls");
//import Controls = require("VSS/Controls");
var Grids = require("VSS/Controls/Grids");
var WorkItemRestClient = require("TFS/WorkItemTracking/RestClient");
var WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
var WorkItemServices = require("TFS/WorkItemTracking/Services");
var Menus = require("VSS/Controls/Menus");
var Navigation = require("VSS/Controls/Navigation");
var DataService = require("./DataService");
var UIService = require("./UIService");
var DependencyTracker = (function () {
    function DependencyTracker() {
        this.RelationTypes = {};
        this.TelemtryClient = TelemetryClient.getClient();
        this.container = $("#container");
        this.menubar = $("#toolbar");
        this.pivotbar = $("#filter-container");
        this.DataService = new DataService.DataService();
    }
    DependencyTracker.prototype.buildGrid = function () {
        var _this = this;
        var me = this;
        this.Context = VSS.getWebContext();
        this.TelemtryClient.trackEvent("buildGrid");
        var control = UIService.UIService.GetWaitControl(DependencyTracker.WaitControlID, me.container);
        control.startWait();
        this.DataService.LoadSettings(this.Context).then(function (settings) {
            _this.Settings = settings;
            _this.DataService.FindAllRelationTypes().then(function (relations) {
                me.RelationTypes = relations;
                me.BuildMenu(me.menubar);
                me.BuildPivotOptions(me.pivotbar);
                me.LoadData(me.container, _this.Context);
            });
        });
    };
    DependencyTracker.prototype.LoadData = function (container, context) {
        var me = this;
        var waitControl = UIService.UIService.GetWaitControl(DependencyTracker.WaitControlID, me.container);
        waitControl.startWait();
        var loadTimer = new StopWatch();
        loadTimer.Start();
        waitControl.setMessage("Loading work item types...");
        me.DataService.GetWorkItemTypes(context).then(function (workItemTypes) {
            waitControl.setMessage("Loading area paths...");
            me.DataService.GetAreaPaths(context).then(function (paths) {
                waitControl.setMessage("Loading backlog");
                me.QueryBacklog(context, paths, workItemTypes).then(function (data) {
                    if (data) {
                        waitControl.setMessage("Populating grid");
                        me.PopulateGrid(container, data, paths);
                    }
                    else {
                        container.text("It appears that you backlog is empty or has no items to display!");
                    }
                    waitControl.endWait();
                    loadTimer.Stop();
                    me.TelemtryClient.trackMetric("Load_Duration", loadTimer.GetDurationInMilliseconds());
                }, function (rej) {
                    me.TelemtryClient.trackException(rej, "DependencyTracker.LoadData");
                    waitControl.endWait();
                });
            });
        });
    };
    DependencyTracker.prototype.GetGridColumns = function (fields) {
        var me = this;
        var sorted = fields.sort(function (a, b) {
            return a.order - b.order;
        });
        var columns = [];
        sorted.forEach(function (col) {
            var definition = { text: col.name, width: col.width, index: col.refname };
            if (col.refname == "System.AreaPath") {
                definition.canSortBy = false;
            }
            if (col.refname == "System.Title") {
                definition.getCellContents = function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) { return me.GetFormattedTitle(column, dataIndex, level, indentIndex); };
            }
            columns.push(definition);
        });
        columns.push({ text: "Relation", width: 100, index: "System.LinkName" });
        return columns;
    };
    DependencyTracker.prototype.PopulateGrid = function (container, data, paths) {
        var me = this;
        var columns = me.GetGridColumns(me.Settings.Fields);
        if (me.Grid) {
            me.Grid.dispose();
        }
        var screenHeight = (screen.availHeight * 0.75) + "px";
        var options = {
            height: screenHeight,
            width: "100%",
            columns: columns,
            openRowDetail: function (index) {
                var workItem = me.Grid.getRowData(index);
                WorkItemServices.WorkItemFormNavigationService.getService().then(function (service) {
                    service.openWorkItem(workItem.id, false);
                });
            }
        };
        // Create the grid in a container element
        me.Grid = Controls.create(Grids.Grid, container, options);
        var gridSource = me.BuildGridSource(data.workItems, data.relations, paths);
        me.Grid.setDataSource(new Grids.GridHierarchySource(gridSource));
    };
    DependencyTracker.prototype.BuildPivotOptions = function (pivotContainer) {
        this.CreateDependenciesFilter(pivotContainer);
        // TODO: Maybe in teh next update
        // this.CreateQueryAcrossProjects(pivotContainer);
    };
    DependencyTracker.prototype.CreateDependenciesFilter = function (pivotContainer) {
        var actual = this.Settings.ShowEmpty;
        var me = this;
        var pivotFilterOptions = {
            behavior: "toggle",
            text: "Show items without dependencies: ",
            items: [
                { id: "show-yes", text: "yes", value: "Yes", selected: actual },
                { id: "show-no", text: "no", value: "No", selected: !actual }
            ],
            change: function (item) {
                if (item.value == "Yes") {
                    me.Settings.ShowEmpty = true;
                }
                else {
                    me.Settings.ShowEmpty = false;
                }
                me.DataService.SaveSettings(me.Context, me.Settings);
                me.LoadData(me.container, me.Context);
            }
        };
        return Controls.create(Navigation.PivotFilter, pivotContainer, pivotFilterOptions);
    };
    DependencyTracker.prototype.CreateQueryAcrossProjects = function (pivotContainer) {
        var actual = false;
        var pivotFilterOptions = {
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
        return Controls.create(Navigation.PivotFilter, pivotContainer, pivotFilterOptions);
    };
    DependencyTracker.prototype.BuildMenu = function (toolbar) {
        var _this = this;
        var me = this;
        var menuOptions = {
            orientation: "horizontal",
            showIcon: true,
            items: [
                { id: "refresh-items", title: "Refresh", icon: "icon-refresh", showText: false, groupId: "icon" },
                { id: "expand-items", title: "Expand", icon: "icon-tree-expand-all", showText: false, groupId: "icon1" },
                { id: "collapse-items", title: "Collapse", icon: "icon-tree-collapse-all", showText: false, groupId: "icon1" },
                { id: "select-columns", text: "Column Options", title: "Column Options", showText: true, noIcon: true, disabled: false, groupId: "text" },
            ],
            executeAction: function (args) {
                var d = args.get_commandName();
                switch (d) {
                    case "refresh-items":
                        me.LoadData(me.container, _this.Context);
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
        return Controls.create(Menus.MenuBar, toolbar, menuOptions);
    };
    DependencyTracker.prototype.SelectColumns = function () {
        var me = this;
        VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService) {
            var extensionContext = VSS.getExtensionContext();
            // Build absolute contribution ID for dialogContent
            var contributionId = extensionContext.publisherId + "." + extensionContext.extensionId + ".configuration";
            var dialogModel;
            // Show dialog
            var dialogOptions = {
                title: "Column Options",
                width: 560,
                height: 400,
                getDialogResult: function () {
                    return dialogModel.GetFieldSelection();
                },
                okCallback: function (result) {
                    if (dialogModel != null) {
                        me.Settings.Fields = result;
                        me.DataService.SaveSettings(me.Context, me.Settings);
                        me.LoadData(me.container, me.Context);
                    }
                }
            };
            dialogService.openDialog(contributionId, dialogOptions).then(function (dialog) {
                dialog.getContributionInstance("configuration").then(function (instance) {
                    instance.SetDataService(me.DataService);
                    instance.SetSettings(me.Settings);
                    instance.Load(me.Context);
                    dialogModel = instance;
                    dialog.updateOkButton(true);
                });
            });
        });
    };
    DependencyTracker.prototype.GetFormattedTitle = function (column, dataIndex, level, indentIndex) {
        var me = this;
        var rowData = me.Grid.getRowData(dataIndex);
        var gridCell = $("<div class='grid-cell'/>").width(column.width);
        var decorator = $("<div class='work-item-color' />").text(" ");
        if (rowData["owned"]) {
            decorator.css("background-color", WitdColourHelper.ResolveColour(rowData["System.WorkItemType"]));
        }
        else {
            decorator.addClass("unowned").css("border-color", WitdColourHelper.ResolveColour(rowData["System.WorkItemType"]));
        }
        gridCell.css("text-indent", (32 * level) + "px");
        var titleHref = $("<a>");
        titleHref.on("click", function () {
            var wait = UIService.UIService.GetWaitControl(DependencyTracker.WaitControlID, me.container);
            wait.startWait();
            WorkItemServices.WorkItemFormNavigationService.getService().then(function (service) {
                service.openWorkItem(rowData["id"], false);
                wait.endWait();
            }, function (err) {
                wait.endWait();
            });
        });
        titleHref.text(rowData["System.Title"]);
        var titleText = $("<div style='display:inline' />").add(titleHref);
        gridCell.append(decorator);
        gridCell.append(titleText);
        return gridCell;
    };
    DependencyTracker.prototype.LoadWorkItemStates = function (context, callBack) {
        // TODO: should we dig around or just hard code ?
        // !Done !Removed
    };
    DependencyTracker.prototype.LoadWorkItemRelationTypes = function () {
        var defer = $.Deferred();
        var client = WorkItemRestClient.getClient();
        client.getRelationTypes().then(function (types) {
            var relationTypes = {};
            types.forEach(function (type) {
                relationTypes[type.referenceName] = type.name;
            });
            defer.resolve(relationTypes);
        });
        return defer.promise();
    };
    DependencyTracker.prototype.QueryBacklog = function (contex, areaPaths, backlogTypes) {
        var _this = this;
        var defer = $.Deferred();
        // create work client
        var client = WorkItemRestClient.getClient();
        var qry = {
            query: ""
        };
        var states = ["New", "Approved", "Committed", "Active"];
        qry.query = WiqlHelper.CreateBacklogWiql(areaPaths, backlogTypes, states, this.Settings.Fields);
        client.queryByWiql(qry, contex.project.name).then(function (backlogIds) {
            var backlog = new Array();
            backlogIds.workItems.forEach(function (workItem) {
                if (backlog.indexOf(workItem.id) < 0) {
                    backlog.push(workItem.id);
                }
            });
            if (backlog.length <= 0) {
                defer.resolve(null);
            }
            else {
                var loadSpecs = new Array();
                var spliceSize = 75;
                var backlogSection = backlog.splice(0, spliceSize);
                while (backlogSection.length > 0) {
                    loadSpecs.push(_this.GetWorkItemDetails(backlogSection, backlogIds.asOf));
                    var backlogSection = backlog.splice(0, spliceSize);
                }
                Q.all(loadSpecs).done(function (all) {
                    var workItems = [];
                    var relations = [];
                    all.forEach(function (resultItem) {
                        workItems = workItems.concat(resultItem.workItems);
                        relations = relations.concat(resultItem.relations);
                    });
                    var result = {
                        workItems: workItems,
                        relations: relations.filter(function (i) { return i !== null; })
                    };
                    defer.resolve(result);
                }, function (rejectReason) {
                    _this.TelemtryClient.trackException(rejectReason, "DependencyTracker.QueryBacklog.QAll");
                    defer.reject(rejectReason);
                });
            }
        }, function (rej) {
            _this.TelemtryClient.trackException(rej, "DependencyTracker.QueryBacklog.queryByWiql");
            defer.reject(rej);
        });
        return defer.promise();
    };
    DependencyTracker.prototype.GetWorkItemDetails = function (backlogItems, asOf) {
        var _this = this;
        var client = WorkItemRestClient.getClient();
        var defer = $.Deferred();
        client.getWorkItems(backlogItems, null, asOf, WorkItemContracts.WorkItemExpand.Relations).then(function (backlogWorkItems) {
            // get relation id's
            var relations = new Array();
            backlogWorkItems.forEach(function (backlogItem, idx, arr) {
                if (backlogItem.relations) {
                    backlogItem.relations.forEach(function (relation) {
                        if (ConfigSettings.RelationTypes.indexOf(relation.rel) >= 0) {
                            relations.push(RelationHelper.FindIDFromLink(relation.url));
                        }
                    });
                }
            });
            if (relations.length > 0) {
                client.getWorkItems(relations, null, asOf, WorkItemContracts.WorkItemExpand.Relations).then(function (backlogRelations) {
                    var result = {
                        workItems: backlogWorkItems,
                        relations: backlogRelations
                    };
                    defer.resolve(result);
                });
            }
            else {
                var result = {
                    workItems: backlogWorkItems,
                    relations: null
                };
                defer.resolve(result);
            }
        }, function (err) {
            _this.TelemtryClient.trackException(err, "DependencyTracker.GetWorkItemDetails.getWorkItems");
            defer.reject(err);
        });
        return defer;
    };
    DependencyTracker.prototype.BuildGridSource = function (backlogItems, relations, paths) {
        var gridSource = new Array();
        var me = this;
        backlogItems.forEach(function (workItem) {
            var rootItem = {
                values: me.PopulateFields(workItem, paths),
                children: new Array(),
                collapsed: false
            };
            if (relations && workItem.relations) {
                workItem.relations.forEach(function (relation) {
                    if (ConfigSettings.RelationTypes.indexOf(relation.rel) >= 0) {
                        var child = relations.filter(function (relationItem) { return relationItem.id == RelationHelper.FindIDFromLink(relation.url); })[0];
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
    };
    DependencyTracker.prototype.PopulateFields = function (workItem, paths) {
        var values = [];
        this.Settings.Fields.forEach(function (field) {
            values[field.refname] = workItem.fields[field.refname];
        });
        // additional values to keep around
        values["url"] = workItem.url;
        values["id"] = workItem.id;
        values["owned"] = this.IsInPath(workItem.fields["System.AreaPath"], paths);
        return values;
    };
    DependencyTracker.prototype.IsInPath = function (workItemPath, paths) {
        var found = paths.filter(function (areaPath) {
            if (areaPath.IncludeChildren) {
                return workItemPath.indexOf(areaPath.Path) >= 0;
            }
            else {
                return workItemPath == areaPath.Path;
            }
        });
        return found.length > 0;
    };
    return DependencyTracker;
}());
DependencyTracker.WaitControlID = "dependencymodelwaitcontrol";
exports.DependencyTracker = DependencyTracker;
//# sourceMappingURL=DependencyTracker.js.map