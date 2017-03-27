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
/// <reference path="../node_modules/@types/jasmine/index.d.ts" />
/// <reference path="../src/dependency-module/Helpers.ts" />
describe('ColumnHelper', function () {
    it('ColumnTitle', function () {
        var fieldName = "My Field";
        var width = 100;
        var title = ColumnHelper.BuildSelectionTitle(fieldName, width);
        expect(title).toEqual("My Field [100]");
    });
});
//# sourceMappingURL=ColumnHelperSpec.js.map