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
define(["require", "exports"], function (require, exports) {
    /// <reference path="../typings/tsd.d.ts" />
    /// <reference path="Configuration.ts" />
    /// <reference path="TelemetryClient.ts" />
    "use strict";
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
            var me = this;
            var available = $("#display-available-list");
            var selected = $("#display-list");
            var select = $("#select_column");
            var remove = $("#remove_column");
            available.change(function () {
                ConfigurationDialogModel.UpdateSelectionButtonState("display-available-list", select);
            });
            selected.change(function () {
                ConfigurationDialogModel.UpdateSelectionButtonState("display-list", remove);
            });
            select.click(function () {
                me.MoveItems("display-available-list", selected, true);
            });
            remove.click(function () {
                me.MoveItems("display-list", available, false);
            });
            var me = this;
            this.DataService.GetWorkItemFields(context).then(function (items) {
                var selectedFields = me.FieldList;
                me.AvailableFields = items;
                items.forEach(function (item) {
                    var fieldReference = selectedFields.filter(function (field) { return field.refname == item.referenceName; });
                    if (fieldReference.length == 0) {
                        available.append("<option value='" + item.referenceName + "'>" + item.name + "</option>");
                    }
                });
                selectedFields.forEach(function (selectedField) {
                    var fieldReference = items.filter(function (item) { return selectedField.refname == item.referenceName; });
                    if (fieldReference.length > 0) {
                        selected.append("<option value='" + fieldReference[0].referenceName + "'>" + fieldReference[0].name + "</option>");
                    }
                });
            });
        };
        ConfigurationDialogModel.UpdateSelectionButtonState = function (controlName, button) {
            var selectedItems = $("#" + controlName + " option:selected");
            if (selectedItems.length > 0) {
                button.removeAttr("disabled");
                button.removeClass("ui-state-disabled");
                button.removeClass("ui-button-disabled");
            }
            else {
                button.add("disabled");
            }
        };
        ConfigurationDialogModel.prototype.MoveItems = function (controlName, target, forward) {
            var me = this;
            var selectedItems = $("#" + controlName + " option:selected");
            selectedItems.each(function (i, e) {
                if (forward) {
                    var column = me.AvailableFields.filter(function (item) { return item.referenceName == e.value; });
                    if (column.length >= 0) {
                        me.FieldList.push({ name: column[0].name, refname: column[0].referenceName, required: false, width: 100 });
                    }
                }
                else {
                    me.FieldList = $.grep(me.FieldList, function (f) { return f.refname == e.value; });
                }
                target.append("<option value='" + e.value + "'>" + e.text + "</option>");
            });
            selectedItems.remove();
        };
        ConfigurationDialogModel.prototype.GetSelectedFields = function () {
            var selected = $("#display-list");
            return null;
        };
        return ConfigurationDialogModel;
    }());
    exports.ConfigurationDialogModel = ConfigurationDialogModel;
});
//# sourceMappingURL=ConfigurationDialog.js.map