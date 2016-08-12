 //---------------------------------------------------------------------
 // <copyright file="WiqlHelperSpec.ts">
 //    This code is licensed under the MIT License.
 //    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
 //    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
 //    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
 //    PARTICULAR PURPOSE AND NONINFRINGEMENT.
 // </copyright>
 // <summary>Testing the Wiql generation methods</summary>
 //---------------------------------------------------------------------

/// <reference path="../scripts/Helpers.ts" />
/// <reference path="../typings/jasmine/jasmine.d.ts" />

describe('WiqlHelper', () => {
    it('CreateBacklogWiql', () => {
        var paths: AreaPathConfiguration[] = [{ Path: 'Project', IncludeChildren: false }, { Path: 'Project\\Team 2', IncludeChildren: false }];
        var backlogItems: string[] = ['Product Backlog Item', 'Bug'];
        var backlogState: string[] = ['New', 'Committed', 'In Progress'];
        var text = WiqlHelper.CreateBacklogWiql(paths, backlogItems, backlogState);
        expect(text).toBe("select [System.WorkItemType], [System.Title], [System.AreaPath], [System.State], [Microsoft.VSTS.Scheduling.Effort], [System.IterationPath], [System.Tags], [System.NodeName], [System.WorkItemType] from WorkItems where( [System.WorkItemType] in ('Product Backlog Item','Bug') and ( [System.AreaPath] = 'Project' or [System.AreaPath] = 'Project\\Team 2' ) and [System.State] in ('New','Committed','In Progress'))", text);
    });

    it('buildPathStatement', () => {
        var paths: AreaPathConfiguration[] = [{ Path: 'Project', IncludeChildren: false }, { Path: 'Project\\Team 2', IncludeChildren: false }];
        var text = WiqlHelper.buildPathStatement(paths);
        var expectedResult = `[System.AreaPath] = 'Project' or [System.AreaPath] = 'Project\\Team 2'`;

        expect(text).toBe(expectedResult);
    });

    it('buildPathStatement_WithChildren', () => {
        var paths: AreaPathConfiguration[] = [{ Path: 'Project', IncludeChildren: true }, { Path: 'Project\\Team 2', IncludeChildren: false }];
        var text = WiqlHelper.buildPathStatement(paths);
        var expectedResult = `[System.AreaPath] under 'Project' or [System.AreaPath] = 'Project\\Team 2'`;

        expect(text).toBe(expectedResult);
    });

   
});
