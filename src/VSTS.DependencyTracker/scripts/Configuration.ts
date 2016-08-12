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

class ConfigSettings {
    static RequirementCategory: string = "Microsoft.RequirementCategory";
    static IncludeBug: boolean = true;
    static BugTypeName: string = "Bug";
    static ResultSize: number = 10;
    static FieldList: string[] = ["[System.WorkItemType]", "[System.Title]", "[System.AreaPath]", "[System.State]", "[Microsoft.VSTS.Scheduling.Effort]", "[System.IterationPath]", "[System.Tags]", "[System.NodeName]", "[System.WorkItemType]"];
    static RelationTypes: string[] = [
        "System.LinkTypes.Dependency-Forward", //sucsessor
        "System.LinkTypes.Dependency-Reverse" //predesessor
    ];
}