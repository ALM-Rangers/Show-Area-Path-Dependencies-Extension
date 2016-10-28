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

interface Action<T> {
    (item: T): void;
}

interface Func<TResult> {
    (): TResult;
}

interface Func1<T, TResult> {
    (item: T): TResult;
}

interface HashTable {
    [key: string]: any;
}

interface AreaPathConfiguration {
    Path: string;
    IncludeChildren: boolean;
}

interface ColumnDefinition {
    name: string;
    refname: string;
    width: number;
    required: boolean;
}

class LoadPromise {
    private executebody: Action<Action<string[]>>;

    constructor(body: Action<Action<string[]>>) {
        this.executebody = body;
    }
    public then(onFulfill: Action<string[]>) {
        var me = this;

        if (me.executebody) {
            me.executebody(onFulfill);
        }
    }
}



