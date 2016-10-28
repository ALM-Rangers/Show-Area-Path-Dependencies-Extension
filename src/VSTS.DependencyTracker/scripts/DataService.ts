
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

/// <reference path="../typings/tsd.d.ts" />
/// <reference path="Configuration.ts" />
/// <reference path="TelemetryClient.ts" />


"use strict";
import WorkItemRestClient = require("TFS/WorkItemTracking/RestClient");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkRestClient = require("TFS/Work/RestClient");
import Contracts = require("TFS/Core/Contracts");

export class DataService {



    public FindAllRelationTypes(): IPromise<HashTable> {
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

    public LoadSettings(context: WebContext): IPromise<IDependancySettings> {
        var defer = $.Deferred<IDependancySettings>();

        VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: IExtensionDataService) => {
            dataService.getDocument(context.collection.name, ConfigSettings.getUserDocumentId(context), { scopeType: "User", defaultValue: ConfigSettings.getDefaultSettings(context) }).then((settings: IDependancySettings) => {
                defer.resolve(settings);
            }, reject => {
                TelemetryClient.getClient().trackEvent("SettingsNotFound");
                defer.resolve(ConfigSettings.getDefaultSettings(context));
            });
        });
        return defer;
    }

    public SaveSettings(context: WebContext, settings: IDependancySettings): IPromise<IDependancySettings> {
        var defer = $.Deferred<IDependancySettings>();

        VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: IExtensionDataService) => {
            dataService.setDocument(context.collection.name, settings, { scopeType: "User" }).then((settings: IDependancySettings) => {
                defer.resolve(settings);
            });
        }, rej => {
            alert("SaveSettings : " + rej);
        });
        return defer;
    }

    public GetWorkItemTypes(context: WebContext): IPromise<string[]> {

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
            TelemetryClient.getClient().trackMetric("DataService.GetWorkItemTypes", timer.GetDurationInMilliseconds());
        }, err => {
            var s = err;
            TelemetryClient.getClient().trackException(err, "coreClient.getWorkItemTypeCategories");
        });

        return defer.promise();
    }

    public GetAreaPaths(context: WebContext): IPromise<AreaPathConfiguration[]> {

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

    public GetWorkItemFields(context: WebContext): IPromise<WorkItemContracts.WorkItemFieldReference[]> {

        var defer = $.Deferred<WorkItemContracts.WorkItemFieldReference[]>();

        this.GetWorkItemTypes(context).then(workItemTypes => {
            var loadSpecs = new Array<IPromise<WorkItemContracts.WorkItemType>>();
            var workItemClient = WorkItemRestClient.getClient();

            workItemTypes.forEach(witType => {
                loadSpecs.push(workItemClient.getWorkItemType(context.project.name, witType));
            });

            Q.all(loadSpecs).done(witTypes => {
                var fields: WorkItemContracts.WorkItemFieldReference[] = [];
                witTypes.forEach(witType => {
                    witType.fieldInstances.forEach(field => {
                        var check = fields.filter(f => { return f.referenceName == field.referenceName; });
                        if (check.length == 0) {
                            fields.push(field);
                        }
                    });

                    defer.resolve(fields.sort((a, b) => { return a.name.localeCompare(b.name); }));
                });
            });

        });

        return defer.promise();

    }

}