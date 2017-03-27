//---------------------------------------------------------------------
// <copyright file="TelemetryClient.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Application Insights Telemetry Client Class</summary>
//---------------------------------------------------------------------
var TelemetryClient = (function () {
    function TelemetryClient() {
        this.IsAvailable = true;
    }
    TelemetryClient.getClient = function () {
        if (!this.telemetryClient) {
            this.telemetryClient = new TelemetryClient();
            this.telemetryClient.Init();
        }
        return this.telemetryClient;
    };
    TelemetryClient.prototype.Init = function () {
        var snippet = {
            config: {
                instrumentationKey: TelemetryClient.DevLabs
            }
        };
        try {
            var webContext = VSS.getWebContext();
            this.IsAvailable = false; //webContext.account.uri.indexOf("visualstudio.com") > 0;
            if (this.IsAvailable) {
                var init = new Microsoft.ApplicationInsights.Initialization(snippet);
                this.appInsightsClient = init.loadAppInsights();
                this.appInsightsClient.setAuthenticatedUserContext(webContext.user.id, webContext.collection.id);
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    };
    TelemetryClient.prototype.trackPageView = function (name, url, properties, measurements, duration) {
        try {
            if (this.IsAvailable) {
                this.appInsightsClient.trackPageView(TelemetryClient.ExtensionContext + "." + name, url, properties, measurements, duration);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    };
    TelemetryClient.prototype.trackEvent = function (name, properties, measurements) {
        try {
            if (this.IsAvailable) {
                this.appInsightsClient.trackEvent(TelemetryClient.ExtensionContext + "." + name, properties, measurements);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    };
    TelemetryClient.prototype.trackException = function (exceptionMessage, handledAt, properties, measurements) {
        try {
            if (this.IsAvailable) {
                console.error(exceptionMessage);
                var error = {
                    name: TelemetryClient.ExtensionContext + "." + handledAt,
                    message: exceptionMessage
                };
                this.appInsightsClient.trackException(error, handledAt, properties, measurements);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    };
    TelemetryClient.prototype.trackMetric = function (name, average, sampleCount, min, max, properties) {
        try {
            if (this.IsAvailable) {
                this.appInsightsClient.trackMetric(TelemetryClient.ExtensionContext + "." + name, average, sampleCount, min, max, properties);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    };
    return TelemetryClient;
}());
TelemetryClient.TestingKey = "";
TelemetryClient.DevLabs = "__INSTRUMENTATIONKEY__";
TelemetryClient.ExtensionContext = "ShowAreaPathDependencies";
//# sourceMappingURL=TelemetryClient.js.map