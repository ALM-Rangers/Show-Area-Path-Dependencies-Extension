//---------------------------------------------------------------------
// <copyright file="Configuration.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>This is the start for configuration settings. At this stage it is "hard coded", but in future we will be setting it using a config page and reading it from the user storage</summary>
//---------------------------------------------------------------------
var ConfigSettings = (function () {
    function ConfigSettings() {
    }
    ConfigSettings.getDefaultSettings = function (context) {
        var settings = {
            id: ConfigSettings.getUserDocumentId(context),
            Fields: ConfigSettings.FieldList,
            Relations: ConfigSettings.RelationTypes,
            ShowEmpty: false,
            SearchAccrossProjects: false
        };
        return settings;
    };
    ConfigSettings.getUserDocumentId = function (context) {
        return ConfigSettings.DocumentId + context.user.id;
    };
    return ConfigSettings;
}());
ConfigSettings.DefaultColumnWidth = 100;
ConfigSettings.RequirementCategory = "Microsoft.RequirementCategory";
ConfigSettings.IncludeBug = true;
ConfigSettings.BugTypeName = "Bug";
ConfigSettings.ResultSize = 10;
//Default fields
ConfigSettings.FieldList = [
    { name: "Work Item Type", refname: "System.WorkItemType", width: 200, required: true, order: 1 },
    { name: "Title", refname: "System.Title", width: 400, required: true, order: 2 },
    { name: "Area Path", refname: "System.AreaPath", width: 200, required: true, order: 3 },
    { name: "State", refname: "System.State", width: 100, required: false, order: 4 },
    { name: "Effort", refname: "Microsoft.VSTS.Scheduling.Effort", width: 10, required: false, order: 4 },
    { name: "Iteration Path", refname: "System.IterationPath", width: 200, required: false, order: 5 },
    { name: "Tags", refname: "System.Tags", width: 100, required: false, order: 6 },
    { name: "Node Name", refname: "System.NodeName", width: 100, required: false, order: 7 }
];
ConfigSettings.RelationTypes = [
    "System.LinkTypes.Dependency-Forward",
    "System.LinkTypes.Dependency-Reverse" //predesessor
];
ConfigSettings.BadFields = ["System.BISLinks"];
ConfigSettings.DocumentId = "vsts.dependencytracker.document.";
//# sourceMappingURL=Configuration.js.map