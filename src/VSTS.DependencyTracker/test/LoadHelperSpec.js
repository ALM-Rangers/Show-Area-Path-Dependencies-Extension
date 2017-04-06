//---------------------------------------------------------------------
// <copyright file="WiqlHelperSpec.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Testing the Wiql generation methods</summary>
//---------------------------------------------------------------------
/// <reference path="../node_modules/@types/jasmine/index.d.ts" />
/// <reference path="../src/types/types.d.ts" />
/// <reference path="../src/dependency-module/Helpers.ts" />
describe("LoadHelper", function () {
    it('BatchingTest', function () {
        var ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        var id = LoadHelper.Batch(ids, 2);
        expect(id.length).toEqual(5);
    });
});
//# sourceMappingURL=LoadHelperSpec.js.map