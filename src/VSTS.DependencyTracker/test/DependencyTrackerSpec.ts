

//---------------------------------------------------------------------
// <copyright file="DependencyTrackerSpec.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Testing the DependencyTracker class</summary>
//---------------------------------------------------------------------

/// <reference path="../typings/vss/vss.d.ts" />
/// <reference path="../typings/vss/tfs.d.ts" />
/// <reference path="../scripts/Helpers.ts" />
/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

"use strict";
import Dep = require("../scripts/DependencyTracker");

import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");

import WorkItemRestClient = require("TFS/WorkItemTracking/RestClient");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemServices = require("TFS/WorkItemTracking/Services");

import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");


describe('DependencyTracker', () => {
    it('GetGridColumns', () => {

        var cols: ColumnDefinition[] = [];
        cols.push({ order: 3, name: "Col 3", refname: "Ref 3", required: true, width: 300 });
        cols.push({ order: 2, name: "Col 2", refname: "Ref 2", required: true, width: 200 });
        cols.push({ order: 1, name: "Col 1", refname: "Ref 1", required: true, width: 100 });
        cols.push({ order: 4, name: "Col 4", refname: "Ref 4", required: true, width: 400 });
        cols.push({ order: 5, name: "Col 5", refname: "Ref 5", required: true, width: 500 });

        var tracker = new Dep.DependencyTracker();

        var gridCols = tracker.GetGridColumns(cols);

        chai.expect(gridCols.length).eq(5);
        chai.expect(gridCols[0].text).eq("Col 1");
        chai.expect(gridCols[1].text).eq("Col 2");
        chai.expect(gridCols[4].text).eq("Col 5");
    });
});
