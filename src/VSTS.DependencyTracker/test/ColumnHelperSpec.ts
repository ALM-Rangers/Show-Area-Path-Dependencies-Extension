//---------------------------------------------------------------------
// <copyright file="ColumnHelperSpec.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Testing the Helpers classes</summary>
//---------------------------------------------------------------------

/// <reference path="../scripts/Helpers.ts" />
/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />

describe('ColumnHelper', () => {
    it('ColumnTitle', () => {
        var fieldName = "My Field";
        var width = 100;
        var title = ColumnHelper.BuildSelectionTitle(fieldName, width);
        chai.expect(title).eq("My Field [100]");
    });
});

