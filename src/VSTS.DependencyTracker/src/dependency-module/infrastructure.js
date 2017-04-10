//---------------------------------------------------------------------
// <copyright file="Infrastructure.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Various infrastructure level constructs, enums, interfaces and classes</summary>
//---------------------------------------------------------------------
var LoadPromise = (function () {
    function LoadPromise(body) {
        this.executebody = body;
    }
    LoadPromise.prototype.then = function (onFulfill) {
        var me = this;
        if (me.executebody) {
            me.executebody(onFulfill);
        }
    };
    return LoadPromise;
}());
//# sourceMappingURL=infrastructure.js.map