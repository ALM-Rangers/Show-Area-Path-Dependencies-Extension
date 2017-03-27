//---------------------------------------------------------------------
// <copyright file="DataService.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>UI Servie Proxy to perform generic UI related actions</summary>
//---------------------------------------------------------------------
"use strict";
var Controls = require("VSS/Controls");
var StatusIndicator = require("VSS/Controls/StatusIndicator");
var UIService = (function () {
    function UIService() {
    }
    UIService.GetWaitControl = function (id, container) {
        if (UIService.WaitControlRegistry[id] == null) {
            var waitControlOptions = {
                cancellable: false,
                message: "Loading...",
                fade: true
            };
            var control = Controls.create(StatusIndicator.WaitControl, container, waitControlOptions);
            UIService.WaitControlRegistry[id] = control;
        }
        return UIService.WaitControlRegistry[id];
    };
    return UIService;
}());
UIService.WaitControlRegistry = {};
exports.UIService = UIService;
//# sourceMappingURL=UIService.js.map