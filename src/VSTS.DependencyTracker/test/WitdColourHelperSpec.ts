//---------------------------------------------------------------------
// <copyright file="WitdColourHelperSpec.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Testing the Helpers classes</summary>
//---------------------------------------------------------------------

/// <reference path="../node_modules/@types/jasmine/index.d.ts" />
/// <reference path="../src/types/types.d.ts" />
/// <reference path="../src/dependency-module/Helpers.ts" />


describe('WitdColourHelper', () => {
    it('ResolveColour_With_ValidKey', () => {
        var witdName = "User Story";
        var colour = WitdColourHelper.ResolveColour(witdName);
        expect(colour).toEqual("#009CCC");
    });
    it('ResolveColour_With_InValidKey', () => {
        var witdName = "Blah";
        var colour = WitdColourHelper.ResolveColour(witdName);
        expect(colour).toEqual("");
    });
});
