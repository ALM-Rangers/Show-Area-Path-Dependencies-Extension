//---------------------------------------------------------------------
// <copyright file="DataService.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Data Servie Proxy to retrieve and update settings and configuration</summary>
//---------------------------------------------------------------------
define(["require", "exports", "TFS/WorkItemTracking/RestClient", "TFS/Work/RestClient"], function (require, exports, WorkItemRestClient, WorkRestClient) {
    /// <reference path="../typings/tsd.d.ts" />
    /// <reference path="Configuration.ts" />
    /// <reference path="telemetryclient.ts" />
    "use strict";
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
                alert("SaveSettings : " + rej);
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
                var s = err;
                TelemetryClient.getClient().trackException(err, "coreClient.getWorkItemTypeCategories");
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
        return DataService;
    }());
    exports.DataService = DataService;
});
//# sourceMappingURL=DataService.js.map