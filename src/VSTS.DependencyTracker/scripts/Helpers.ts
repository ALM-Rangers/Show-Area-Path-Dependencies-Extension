//---------------------------------------------------------------------
// <copyright file="Helpers.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Various helper classes and functions</summary>
//---------------------------------------------------------------------

/// <reference path="Configuration.ts" />

class WiqlHelper {

    static CreateBacklogWiql(paths: AreaPathConfiguration[], backlogTypes: string[], backlogStates: string[], fields: ColumnDefinition[]): string {

        var backlogTypeString = "'" + backlogTypes.join("','") + "'";
        var backlogStateString = "'" + backlogStates.join("','") + "'";

        var fieldNames: string[] = [];
        fields.forEach(field => { fieldNames.push("[" + field.refname + "]"); });

        var fieldStatement = fieldNames.join(", ") + " ";

        var queryTemplate = "select " + fieldStatement +
            "from WorkItems " +
            "where( [System.WorkItemType] in ({BacklogTypes}) " +
            "and ( {AreaPaths} ) " +
            "and [System.State] in ({BacklogTypeStates}))";// +

        var areaPath = WiqlHelper.buildPathStatement(paths);

        var builtQuery = queryTemplate.replace("{AreaPaths}", areaPath);
        builtQuery = builtQuery.replace(/{BacklogTypes}/g, backlogTypeString);
        builtQuery = builtQuery.replace(/{BacklogTypeStates}/g, backlogStateString);

        return builtQuery;
    }

    static buildPathStatement(paths: AreaPathConfiguration[]): string {
        var areaPath = "";

        paths.forEach(path => {
            var statement = "[System.AreaPath] {op} '{Path}'".replace("{Path}", path.Path);
            statement = statement.replace("{op}", (path.IncludeChildren) ? "under" : "=");

            if (areaPath.length > 0) {
                statement = " or " + statement;
            }
            areaPath += statement;
        });

        return areaPath;
    }
}

class ColumnHelper {
    static BuildSelectionTitle(name: string, width: number): string {
        return name + " [" + width + "]";
    }

}

class RelationHelper {
    static FindIDFromLink(uri: string): number {

        var sections = uri.split("/");

        var id = sections[sections.length - 1];

        return parseInt(id);
    }

}

class WitdColourHelper {

    static ResolveColour(workItemTypeName: string) : string {
        var colourMap = {};
        colourMap["User Story"] = "#009CCC";
        colourMap["Product Backlog Item"] = "#009CCC";
        colourMap["Requirement"] = "#009CCC";
        colourMap["Feature"] = "#773B93";
        colourMap["Epic"] = "#FF7B00";
        colourMap["Task"] = "#F2CB1D";
        colourMap["Bug"] = "#CC293D";


        if (colourMap[workItemTypeName]) {
            return colourMap[workItemTypeName];
        } else {
            return "";
        }
    }
}

class StopWatch {

    public StartTime: Date;
    public EndTime: Date; 

    public Start() {
        this.StartTime = new Date(Date.now());
    }
    public Stop() {
        this.EndTime = new Date(Date.now());
    }

    public GetDurationInMilliseconds(): number {
        if (this.StartTime && this.EndTime) {
            return (this.EndTime.getTime() - this.StartTime.getTime());
        }
        return -1;
    }

    public GetDurationInSeconds(): number {
        return this.GetDurationInMilliseconds() / 1000;
    }
}

