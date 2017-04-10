/// <reference path="../../node_modules/vss-web-extension-sdk/typings/vss.d.ts" />
/// <reference path="../../node_modules/vss-web-extension-sdk/typings/tfs.d.ts" />
/// <reference path="../dependency-module/infrastructure.ts" />
/// <reference path="../dependency-module/configuration.ts" />
/// <reference path="../dependency-module/telemetryclient.ts" />


import * as __q from "q";

declare global {
    const Q: typeof __q;
}