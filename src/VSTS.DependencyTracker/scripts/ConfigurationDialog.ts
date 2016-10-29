
//---------------------------------------------------------------------
// <copyright file="DataService.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Data Servie Proxy to retrieve and update settings and configuration</summary>
//---------------------------------------------------------------------

/// <reference path="../typings/tsd.d.ts" />
/// <reference path="Configuration.ts" />
/// <reference path="TelemetryClient.ts" />


"use strict";
import Controls = require("VSS/Controls");

import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");

import DataService = require("./DataService");
import UIService = require("./UIService");




export class ConfigurationDialogModel {
    static WaitControlID = "ConfigurationDialogModelWaitControl";

    public Context: WebContext;
    public DataService: DataService.DataService;
    public Settings: IDependancySettings;
    public FieldList: ColumnDefinition[] = [];
    public AvailableFields: WorkItemContracts.WorkItemFieldReference[];



    constructor(context: WebContext) {
        this.Context = context;

    }
    public SetDataService(dataService: DataService.DataService) {
        this.DataService = dataService;
    }

    public SetSettings(settings: IDependancySettings) {
        this.Settings = settings;
        settings.Fields.forEach((field: ColumnDefinition) => {
            this.FieldList.push(field);
        });
    }

    public Load(context: WebContext) {

        var wait = UIService.UIService.GetWaitControl(ConfigurationDialogModel.WaitControlID, $("#container"));

        wait.startWait();

        var me = this;
        var available = $("#display-available-list");
        var selected = $("#display-list");

        var select = $("#select_column");
        var remove = $("#remove_column");

        available.change(() => {
            ConfigurationDialogModel.UpdateSelectionButtonState("display-available-list", select);
        });

        selected.change(() => {
            ConfigurationDialogModel.UpdateSelectionButtonState("display-list", remove);
        });

        select.click(() => {
            me.MoveItems("display-available-list", selected, true);
        });
        remove.click(() => {
            me.MoveItems("display-list", available, false);
        });

        var me = this;

        this.DataService.GetWorkItemFields(context).then(items => {
            var selectedFields = me.FieldList;
            me.AvailableFields = items;

            items.forEach(item => {
                var fieldReference = selectedFields.filter(field => { return field.refname == item.referenceName; });
                if (fieldReference.length == 0) {
                    available.append("<option value='" + item.referenceName + "'>" + item.name + "</option>");
                }
            });

            selectedFields.forEach(selectedField => {
                var fieldReference = items.filter(item => { return selectedField.refname == item.referenceName; });
                if (fieldReference.length > 0) {
                    selected.append("<option value='" + fieldReference[0].referenceName + "'>" + fieldReference[0].name + "</option>");
                }
            });

            wait.endWait();
        },rej=> {
            wait.endWait();
        });

    }

    static UpdateSelectionButtonState(controlName: string, button: JQuery) {
        var selectedItems = $("#" + controlName + " option:selected");
        if (selectedItems.length > 0) {
            button.removeAttr("disabled");
            button.removeClass("ui-state-disabled");
            button.removeClass("ui-button-disabled");
        } else {
            button.add("disabled");
        }
    }

    public MoveItems(controlName: string, target: JQuery, forward: boolean) {
        var me = this;
        var selectedItems = $("#" + controlName + " option:selected");

        selectedItems.each((i, e: any) => {
            if (forward) {
                var column = me.AvailableFields.filter(item => { return item.referenceName == e.value; });
                if (column.length >= 0) {
                    me.FieldList.push({ name: column[0].name, refname: column[0].referenceName, required: false, width: 100, order: me.FieldList.length + 1 });
                }
            } else {
                me.FieldList = me.FieldList.filter(f => { return f.refname != e.value });
            }
            target.append("<option value='" + e.value + "'>" + e.text + "</option>");
        });

        selectedItems.remove();
    }

    public GetFieldSelection(): ColumnDefinition[] {

        var list = this.FieldList;

        ConfigSettings.FieldList.filter(f => f.required).forEach(requiredItem => {
            var found = list.filter(l => {
                return l.refname == requiredItem.refname;
            });

            if (found.length <= 0) {
                list.push(requiredItem);
            }

        });

        return list;
    }

}