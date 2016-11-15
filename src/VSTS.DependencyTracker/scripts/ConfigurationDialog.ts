//---------------------------------------------------------------------
// <copyright file="Configut=ConfigurationDialog.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// Model for the selection and setting op columns and their widths. 
// Interacts with the select_column.html page
// < /summary>
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
        var availableList = $("#display-available-list");
        var selectedList = $("#display-list");

        var selectButton = $("#select_column");
        var removeButton = $("#remove_column");
        var widthTextBox = $("#column-width");

        var orderUp = $("#moveUp");
        var orderDown = $("#moveDown");

        availableList.change(() => {
            ConfigurationDialogModel.UpdateSelectionButtonState(availableList, selectButton);
        });

        selectedList.change(() => {
            ConfigurationDialogModel.UpdateSelectionButtonState(selectedList, removeButton);
            ConfigurationDialogModel.UpdateOrderButtonStates(selectedList, [orderUp, orderDown]);

            me.UpdateWidthTextBox();
        });

        widthTextBox.change(() => {
            me.UpdateSelectedItemWidth();
        });

        selectButton.click(() => {
            me.MoveItems(availableList, selectedList, true);
        });
        removeButton.click(() => {
            me.MoveItems(selectedList, availableList, false);
        });

        orderUp.click(() => {
            me.AdjustSelectedItemOrder(selectedList, "u");
        })
        orderDown.click(() => {
            me.AdjustSelectedItemOrder(selectedList, "d");
        })

        var me = this;

        this.DataService.GetWorkItemFields(context).then(items => {
            var selectedFields = me.FieldList;
            me.AvailableFields = items;

            items.forEach(item => {
                var fieldReference = selectedFields.filter(field => { return field.refname == item.referenceName; });
                if (fieldReference.length == 0) {
                    availableList.append("<option value='" + item.referenceName + "'>" + item.name + "</option>");
                }
            });

            selectedFields.sort((a: ColumnDefinition, b: ColumnDefinition) => { return a.order - b.order; }).forEach(selectedField => {
                selectedList.append("<option value='" + selectedField.refname + "'>" + ColumnHelper.BuildSelectionTitle(selectedField.name, selectedField.width) + "</option>");
            });

            wait.endWait();
        }, rej => {
            wait.endWait();
        });

    }

    public AdjustSelectedItemOrder(selectedList: JQuery, direction: string) {
        var me = this;
        var selectedItem = $("#display-list").find(":selected");
        if (selectedItem) {
            var refName = selectedItem.val();
            var selectedColumn = me.FieldList.filter(f => { return f.refname == refName });
            if (selectedColumn.length > 0) {
                if (direction == "u" && selectedColumn[0].order > 1) {
                    var newOrder = selectedColumn[0].order - 1;
                    var replace = me.FieldList.filter(f => { return f.order == newOrder });
                    replace[0].order += 1;
                    selectedColumn[0].order = newOrder;
                    var prev = selectedItem.prev();
                    selectedItem.detach().insertBefore(prev);
                } else if (direction == "d" && selectedColumn[0].order < me.FieldList.length) {
                    var newOrder = selectedColumn[0].order + 1;
                    var replace = me.FieldList.filter(f => { return f.order == newOrder });
                    replace[0].order -= 1;
                    selectedColumn[0].order = newOrder;

                    var next = selectedItem.next();
                    selectedItem.detach().insertAfter(next);
                }

            }
        }
    }

    static UpdateSelectionButtonState(control: JQuery, button: JQuery) {
        var selectedItems = control.find("option:selected");
        if (selectedItems.length > 0) {
            button.removeAttr("disabled");
            button.removeClass("ui-state-disabled");
            button.removeClass("ui-button-disabled");
        } else {
            button.attr("disabled", "disabled");
        }
    }

    static UpdateOrderButtonStates(selection: JQuery, buttons: JQuery[]) {
        var selectedItems = selection.find("option:selected");
        if (selectedItems.length == 1) {
            buttons.forEach(button => {
                button.removeAttr("disabled");
                button.removeClass("ui-state-disabled");
                button.removeClass("ui-button-disabled");
            });
        } else {
            buttons.forEach(button => {
                button.attr("disabled", "disabled");
            });
        }
    }

    public UpdateSelectedItemWidth() {
        var me = this;
        var widthTextBox = $("#column-width");
        var selectedItem: any = ConfigurationDialogModel.GetSelectedItem($("#display-list"));

        if (selectedItem) {
            var refName = selectedItem.value;
            var selectedColumn = me.FieldList.filter(f => { return f.refname == refName });
            if (selectedColumn.length > 0) {
                selectedColumn[0].width = widthTextBox.val();
                selectedItem.innerText = ColumnHelper.BuildSelectionTitle(selectedColumn[0].name, selectedColumn[0].width);
            }
        }
    }

    static GetSelectedItem(control: JQuery): any {

        var selectedItems = control.find(":selected");
        if (selectedItems.length > 0) {
            return selectedItems[0];
        }
        return null;
    }

    public UpdateWidthTextBox() {
        var me = this;
        var widthTextBox = $("#column-width");

        var selectedItems = $("#display-list option:selected")

        var selectedItem: any = ConfigurationDialogModel.GetSelectedItem($("#display-list"));

        if (selectedItems.length == 1 && selectedItem) {
            widthTextBox.removeClass("disabled");
            widthTextBox.removeAttr("disabled");
            var selected = selectedItem.value;

            var selectedColumn = me.FieldList.filter(f => { return f.refname == selected; });

            if (selectedColumn.length > 0) {
                widthTextBox.val(selectedColumn[0].width);
            } else {
                widthTextBox.val(100);
            }

        } else {
            widthTextBox.addClass("disabled");
            widthTextBox.attr("disabled", "disabled");
            widthTextBox.val("");
        }
    }

    public MoveItems(source: JQuery, target: JQuery, forward: boolean) {
        var me = this;
        var selectedItems = source.find("option:selected");

        selectedItems.each((i, e: any) => {
            var displayText: string = e.text;

            if (displayText.indexOf("[") > 0) {
                displayText = displayText.split("[")[0];
            }

            if (forward) {
                var column = me.AvailableFields.filter(item => { return item.referenceName == e.value; });
                if (column.length >= 0) {
                    var maxOrder = 0;
                    me.FieldList.forEach(item => {
                        if (item.order > maxOrder) {
                            maxOrder = item.order;
                        }
                    });
                    me.FieldList.push({ name: column[0].name, refname: column[0].referenceName, required: false, width: 100, order: maxOrder +1 });
                }
                displayText = ColumnHelper.BuildSelectionTitle(e.text, ConfigSettings.DefaultColumnWidth);
            } else {
                me.FieldList = me.FieldList.filter(f => { return f.refname != e.value });
                var counter = 0;
                me.FieldList.sort((a: ColumnDefinition, b: ColumnDefinition) => { return a.order - b.order; }).forEach(item => {
                    counter++;
                    item.order = counter;
                });
            }
            target.append("<option value='" + e.value + "'>" + displayText + "</option>");
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