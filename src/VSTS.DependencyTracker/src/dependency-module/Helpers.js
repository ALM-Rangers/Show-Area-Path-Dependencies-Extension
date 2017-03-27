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
/// <reference path="infrastructure.ts" />
var WiqlHelper = (function () {
    function WiqlHelper() {
    }
    WiqlHelper.CreateBacklogWiql = function (paths, backlogTypes, backlogStates, fields) {
        var backlogTypeString = "'" + backlogTypes.join("','") + "'";
        var backlogStateString = "'" + backlogStates.join("','") + "'";
        var fieldNames = [];
        fields.forEach(function (field) { fieldNames.push("[" + field.refname + "]"); });
        var fieldStatement = fieldNames.join(", ") + " ";
        var queryTemplate = "select " + fieldStatement +
            "from WorkItems " +
            "where( [System.WorkItemType] in ({BacklogTypes}) " +
            "and ( {AreaPaths} ) " +
            "and [System.State] in ({BacklogTypeStates}))"; // +
        var areaPath = WiqlHelper.buildPathStatement(paths);
        var builtQuery = queryTemplate.replace("{AreaPaths}", areaPath);
        builtQuery = builtQuery.replace(/{BacklogTypes}/g, backlogTypeString);
        builtQuery = builtQuery.replace(/{BacklogTypeStates}/g, backlogStateString);
        return builtQuery;
    };
    WiqlHelper.buildPathStatement = function (paths) {
        var areaPath = "";
        paths.forEach(function (path) {
            var statement = "[System.AreaPath] {op} '{Path}'".replace("{Path}", path.Path);
            statement = statement.replace("{op}", (path.IncludeChildren) ? "under" : "=");
            if (areaPath.length > 0) {
                statement = " or " + statement;
            }
            areaPath += statement;
        });
        return areaPath;
    };
    return WiqlHelper;
}());
var ColumnHelper = (function () {
    function ColumnHelper() {
    }
    ColumnHelper.BuildSelectionTitle = function (name, width) {
        return name + " [" + width + "]";
    };
    return ColumnHelper;
}());
var RelationHelper = (function () {
    function RelationHelper() {
    }
    RelationHelper.FindIDFromLink = function (uri) {
        var sections = uri.split("/");
        var id = sections[sections.length - 1];
        return parseInt(id);
    };
    return RelationHelper;
}());
var WitdColourHelper = (function () {
    function WitdColourHelper() {
    }
    WitdColourHelper.ResolveColour = function (workItemTypeName) {
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
        }
        else {
            return "";
        }
    };
    return WitdColourHelper;
}());
var StopWatch = (function () {
    function StopWatch() {
    }
    StopWatch.prototype.Start = function () {
        this.StartTime = new Date(Date.now());
    };
    StopWatch.prototype.Stop = function () {
        this.EndTime = new Date(Date.now());
    };
    StopWatch.prototype.GetDurationInMilliseconds = function () {
        if (this.StartTime && this.EndTime) {
            return (this.EndTime.getTime() - this.StartTime.getTime());
        }
        return -1;
    };
    StopWatch.prototype.GetDurationInSeconds = function () {
        return this.GetDurationInMilliseconds() / 1000;
    };
    return StopWatch;
}());
//# sourceMappingURL=Helpers.js.map