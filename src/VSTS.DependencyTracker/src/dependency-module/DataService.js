//---------------------------------------------------------------------
// <copyright file="DataService.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Data Service Proxy to retrieve and update settings and configuration</summary>
//---------------------------------------------------------------------
"use strict";
var WorkItemRestClient = require("TFS/WorkItemTracking/RestClient");
var WorkRestClient = require("TFS/Work/RestClient");
var DataService = (function () {
    function DataService() {
    }
    DataService.prototype.FindAllRelationTypes = function () {
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
    DataService.prototype.LoadSettings = function (context) {
        var defer = $.Deferred();
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            dataService.getDocument(context.collection.name, ConfigSettings.getUserDocumentId(context), { scopeType: "User", defaultValue: ConfigSettings.getDefaultSettings(context) }).then(function (settings) {
                defer.resolve(settings);
            }, function (reject) {
                TelemetryClient.getClient().trackEvent("SettingsNotFound");
                defer.resolve(ConfigSettings.getDefaultSettings(context));
            });
        });
        return defer;
    };
    DataService.prototype.SaveSettings = function (context, settings) {
        var defer = $.Deferred();
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            dataService.setDocument(context.collection.name, settings, { scopeType: "User" }).then(function (settings) {
                defer.resolve(settings);
            });
        }, function (rej) {
            TelemetryClient.getClient().trackException("SaveSettings error: " + rej, "DataService.SaveSettings");
        });
        return defer;
    };
    DataService.prototype.GetWorkItemTypes = function (context) {
        var timer = new StopWatch();
        timer.Start();
        var me = this;
        var defer = $.Deferred();
        var coreClient = WorkItemRestClient.getClient();
        coreClient.getWorkItemTypeCategories(context.project.name).then(function (categories) {
            var requirementCategory = categories.filter(function (wtc, index, categories) { return wtc.referenceName === ConfigSettings.RequirementCategory; })[0];
            var workItemTypes = me.BuildWorkItemList(requirementCategory);
            defer.resolve(workItemTypes);
            timer.Stop();
            TelemetryClient.getClient().trackMetric("DataService.GetWorkItemTypes", timer.GetDurationInMilliseconds());
        }, function (err) {
            TelemetryClient.getClient().trackException(err, "DataService.GetWorkItemTypes");
        });
        return defer.promise();
    };
    DataService.prototype.GetAreaPaths = function (context) {
        var defer = $.Deferred();
        //setup search team context
        var teamContext = {
            project: context.project.name,
            projectId: context.project.id,
            team: context.team.name,
            teamId: context.team.id
        };
        //create work client
        var client = WorkRestClient.getClient();
        //query the area paths
        client.getTeamFieldValues(teamContext).then(function (settings) {
            var areaPaths = new Array();
            settings.values.forEach(function (item) {
                areaPaths.push({ Path: item.value, IncludeChildren: item.includeChildren });
            });
            defer.resolve(areaPaths);
        });
        return defer.promise();
    };
    DataService.prototype.BuildWorkItemList = function (requirementCategory) {
        var requirementTypes = new Array();
        requirementCategory.workItemTypes.forEach(function (workItem) { requirementTypes.push(workItem.name); });
        if (ConfigSettings.IncludeBug) {
            //if bug does not exist - add it...
            if (requirementTypes.indexOf(ConfigSettings.BugTypeName) < 0) {
                requirementTypes.push(ConfigSettings.BugTypeName);
            }
        }
        return requirementTypes;
    };
    DataService.prototype.GetWorkItemFields = function (context) {
        var defer = $.Deferred();
        this.GetWorkItemTypes(context).then(function (workItemTypes) {
            var loadSpecs = new Array();
            var workItemClient = WorkItemRestClient.getClient();
            workItemTypes.forEach(function (witType) {
                loadSpecs.push(workItemClient.getWorkItemType(context.project.name, witType));
            });
            Q.all(loadSpecs).done(function (witTypes) {
                var fields = [];
                witTypes.forEach(function (witType) {
                    witType.fieldInstances.forEach(function (field) {
                        if (!(ConfigSettings.BadFields.indexOf(field.referenceName) >= 0)) {
                            var check = fields.filter(function (f) { return f.referenceName == field.referenceName; });
                            if (check.length == 0) {
                                fields.push(field);
                            }
                        }
                    });
                    defer.resolve(fields.sort(function (a, b) { return a.name.localeCompare(b.name); }));
                });
            }, function (rej) {
                TelemetryClient.getClient().trackException(rej, "DataService.GetWorkItemFields");
            });
        });
        return defer.promise();
    };
    return DataService;
}());
exports.DataService = DataService;
//# sourceMappingURL=DataService.js.map