
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

/// <reference path="../typings/tsd.d.ts" />


"use strict";
import WorkItemRestClient = require("TFS/WorkItemTracking/RestClient");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkRestClient = require("TFS/Work/RestClient");
import Contracts = require("TFS/Core/Contracts");

import Controls = require("VSS/Controls");
import StatusIndicator = require("VSS/Controls/StatusIndicator");

interface WaitControlTable {
    [key: string]: StatusIndicator.WaitControl;
}

export class UIService {

    static WaitControlRegistry: WaitControlTable = {};


    static GetWaitControl(id: string, container: any): StatusIndicator.WaitControl {
        if (UIService.WaitControlRegistry[id] == null) {
            var waitControlOptions: StatusIndicator.IWaitControlOptions = {
                cancellable: false,
                message: "Loading...",
                fade: true
            };

            var control = Controls.create(StatusIndicator.WaitControl, container, waitControlOptions);
            UIService.WaitControlRegistry[id] = control;
        }
        return UIService.WaitControlRegistry[id];
    }

}