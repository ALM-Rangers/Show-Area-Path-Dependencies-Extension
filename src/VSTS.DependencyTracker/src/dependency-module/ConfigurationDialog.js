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
"use strict";
var UIService = require("./UIService");
var ConfigurationDialogModel = (function () {
    function ConfigurationDialogModel(context) {
        this.FieldList = [];
        this.Context = context;
    }
    ConfigurationDialogModel.prototype.SetDataService = function (dataService) {
        this.DataService = dataService;
    };
    ConfigurationDialogModel.prototype.SetSettings = function (settings) {
        var _this = this;
        this.Settings = settings;
        settings.Fields.forEach(function (field) {
            _this.FieldList.push(field);
        });
    };
    ConfigurationDialogModel.prototype.Load = function (context) {
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
        availableList.change(function () {
            ConfigurationDialogModel.UpdateSelectionButtonState(availableList, selectButton);
        });
        selectedList.change(function () {
            ConfigurationDialogModel.UpdateSelectionButtonState(selectedList, removeButton);
            ConfigurationDialogModel.UpdateOrderButtonStates(selectedList, [orderUp, orderDown]);
            me.UpdateWidthTextBox();
        });
        widthTextBox.change(function () {
            me.UpdateSelectedItemWidth();
        });
        selectButton.click(function () {
            me.MoveItems(availableList, selectedList, true);
        });
        removeButton.click(function () {
            me.MoveItems(selectedList, availableList, false);
        });
        orderUp.click(function () {
            me.AdjustSelectedItemOrder(selectedList, "u");
        });
        orderDown.click(function () {
            me.AdjustSelectedItemOrder(selectedList, "d");
        });
        var me = this;
        this.DataService.GetWorkItemFields(context).then(function (items) {
            var selectedFields = me.FieldList;
            me.AvailableFields = items;
            items.forEach(function (item) {
                var fieldReference = selectedFields.filter(function (field) { return field.refname == item.referenceName; });
                if (fieldReference.length == 0) {
                    availableList.append("<option value='" + item.referenceName + "'>" + item.name + "</option>");
                }
            });
            selectedFields.sort(function (a, b) { return a.order - b.order; }).forEach(function (selectedField) {
                selectedList.append("<option value='" + selectedField.refname + "'>" + ColumnHelper.BuildSelectionTitle(selectedField.name, selectedField.width) + "</option>");
            });
            wait.endWait();
        }, function (rej) {
            wait.endWait();
        });
    };
    ConfigurationDialogModel.prototype.AdjustSelectedItemOrder = function (selectedList, direction) {
        var me = this;
        var selectedItem = $("#display-list").find(":selected");
        if (selectedItem) {
            var refName = selectedItem.val();
            var selectedColumn = me.FieldList.filter(function (f) { return f.refname == refName; });
            if (selectedColumn.length > 0) {
                if (direction == "u" && selectedColumn[0].order > 1) {
                    var newOrder = selectedColumn[0].order - 1;
                    var replace = me.FieldList.filter(function (f) { return f.order == newOrder; });
                    replace[0].order += 1;
                    selectedColumn[0].order = newOrder;
                    var prev = selectedItem.prev();
                    selectedItem.detach().insertBefore(prev);
                }
                else if (direction == "d" && selectedColumn[0].order < me.FieldList.length) {
                    var newOrder = selectedColumn[0].order + 1;
                    var replace = me.FieldList.filter(function (f) { return f.order == newOrder; });
                    replace[0].order -= 1;
                    selectedColumn[0].order = newOrder;
                    var next = selectedItem.next();
                    selectedItem.detach().insertAfter(next);
                }
            }
        }
    };
    ConfigurationDialogModel.UpdateSelectionButtonState = function (control, button) {
        var selectedItems = control.find("option:selected");
        if (selectedItems.length > 0) {
            button.removeAttr("disabled");
            button.removeClass("ui-state-disabled");
            button.removeClass("ui-button-disabled");
        }
        else {
            button.attr("disabled", "disabled");
        }
    };
    ConfigurationDialogModel.UpdateOrderButtonStates = function (selection, buttons) {
        var selectedItems = selection.find("option:selected");
        if (selectedItems.length == 1) {
            buttons.forEach(function (button) {
                button.removeAttr("disabled");
                button.removeClass("ui-state-disabled");
                button.removeClass("ui-button-disabled");
            });
        }
        else {
            buttons.forEach(function (button) {
                button.attr("disabled", "disabled");
            });
        }
    };
    ConfigurationDialogModel.prototype.UpdateSelectedItemWidth = function () {
        var me = this;
        var widthTextBox = $("#column-width");
        var selectedItem = ConfigurationDialogModel.GetSelectedItem($("#display-list"));
        if (selectedItem) {
            var refName = selectedItem.value;
            var selectedColumn = me.FieldList.filter(function (f) { return f.refname == refName; });
            if (selectedColumn.length > 0) {
                selectedColumn[0].width = widthTextBox.val();
                selectedItem.innerText = ColumnHelper.BuildSelectionTitle(selectedColumn[0].name, selectedColumn[0].width);
            }
        }
    };
    ConfigurationDialogModel.GetSelectedItem = function (control) {
        var selectedItems = control.find(":selected");
        if (selectedItems.length > 0) {
            return selectedItems[0];
        }
        return null;
    };
    ConfigurationDialogModel.prototype.UpdateWidthTextBox = function () {
        var me = this;
        var widthTextBox = $("#column-width");
        var selectedItems = $("#display-list option:selected");
        var selectedItem = ConfigurationDialogModel.GetSelectedItem($("#display-list"));
        if (selectedItems.length == 1 && selectedItem) {
            widthTextBox.removeClass("disabled");
            widthTextBox.removeAttr("disabled");
            var selected = selectedItem.value;
            var selectedColumn = me.FieldList.filter(function (f) { return f.refname == selected; });
            if (selectedColumn.length > 0) {
                widthTextBox.val(selectedColumn[0].width);
            }
            else {
                widthTextBox.val(100);
            }
        }
        else {
            widthTextBox.addClass("disabled");
            widthTextBox.attr("disabled", "disabled");
            widthTextBox.val("");
        }
    };
    ConfigurationDialogModel.prototype.MoveItems = function (source, target, forward) {
        var me = this;
        var selectedItems = source.find("option:selected");
        selectedItems.each(function (i, e) {
            var displayText = e.text;
            if (displayText.indexOf("[") > 0) {
                displayText = displayText.split("[")[0];
            }
            if (forward) {
                var column = me.AvailableFields.filter(function (item) { return item.referenceName == e.value; });
                if (column.length >= 0) {
                    var maxOrder = 0;
                    me.FieldList.forEach(function (item) {
                        if (item.order > maxOrder) {
                            maxOrder = item.order;
                        }
                    });
                    me.FieldList.push({ name: column[0].name, refname: column[0].referenceName, required: false, width: 100, order: maxOrder + 1 });
                }
                displayText = ColumnHelper.BuildSelectionTitle(e.text, ConfigSettings.DefaultColumnWidth);
            }
            else {
                me.FieldList = me.FieldList.filter(function (f) { return f.refname != e.value; });
                var counter = 0;
                me.FieldList.sort(function (a, b) { return a.order - b.order; }).forEach(function (item) {
                    counter++;
                    item.order = counter;
                });
            }
            target.append("<option value='" + e.value + "'>" + displayText + "</option>");
        });
        selectedItems.remove();
    };
    ConfigurationDialogModel.prototype.GetFieldSelection = function () {
        var list = this.FieldList;
        ConfigSettings.FieldList.filter(function (f) { return f.required; }).forEach(function (requiredItem) {
            var found = list.filter(function (l) {
                return l.refname == requiredItem.refname;
            });
            if (found.length <= 0) {
                list.push(requiredItem);
            }
        });
        return list.filter(function (exclusion) { return ConfigSettings.BadFields.indexOf(exclusion.refname) < 0; });
    };
    return ConfigurationDialogModel;
}());
ConfigurationDialogModel.WaitControlID = "ConfigurationDialogModelWaitControl";
exports.ConfigurationDialogModel = ConfigurationDialogModel;
//# sourceMappingURL=ConfigurationDialog.js.map