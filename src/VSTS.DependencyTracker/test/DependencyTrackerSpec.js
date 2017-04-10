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
define(["require", "exports", "../src/dependency-module/DependencyTracker"], function (require, exports, Dep) {
    /// <reference path="../node_modules/@types/jasmine/index.d.ts" />
    /// <reference path="../src/types/types.d.ts" />
    /// <reference path="../src/dependency-module/Helpers.ts" />
    "use strict";
    describe('DependencyTracker', function () {
        it('GetGridColumns', function () {
            var cols = [];
            cols.push({ order: 3, name: "Col 3", refname: "Ref 3", required: true, width: 300 });
            cols.push({ order: 2, name: "Col 2", refname: "Ref 2", required: true, width: 200 });
            cols.push({ order: 1, name: "Col 1", refname: "Ref 1", required: true, width: 100 });
            cols.push({ order: 4, name: "Col 4", refname: "Ref 4", required: true, width: 400 });
            cols.push({ order: 5, name: "Col 5", refname: "Ref 5", required: true, width: 500 });
            var tracker = new Dep.DependencyTracker();
            var gridCols = tracker.GetGridColumns(cols);
            expect(gridCols.length).toEqual(5);
            expect(gridCols[0].text).toEqual("Col 1");
            expect(gridCols[1].text).toEqual("Col 2");
            expect(gridCols[4].text).toEqual("Col 5");
        });
    });
});
//# sourceMappingURL=DependencyTrackerSpec.js.map