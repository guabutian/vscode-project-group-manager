import * as vscode from 'vscode';
import { GroupManager, ProjectGroup } from './groupManager';

export class GroupsTreeProvider implements vscode.TreeDataProvider<GroupTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GroupTreeItem | undefined | null | void> = new vscode.EventEmitter<GroupTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GroupTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private groupManager: GroupManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GroupTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GroupTreeItem): Thenable<GroupTreeItem[]> {
        if (!element) {
            const groups = this.groupManager.getAllGroups();
            return Promise.resolve(
                groups.map(group => new GroupTreeItem(group))
            );
        }
        return Promise.resolve([]);
    }
}

export class GroupTreeItem extends vscode.TreeItem {
    constructor(public readonly group: ProjectGroup) {
        super(group.name, vscode.TreeItemCollapsibleState.None);

        this.tooltip = `${group.projects.length} 个项目`;
        this.description = `${group.projects.length} 个项目`;
        this.contextValue = 'group';

        // "all" 组使用特殊图标
        if (group.name === 'all') {
            this.iconPath = new vscode.ThemeIcon('folder-library', new vscode.ThemeColor('charts.blue'));
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }

        // 双击打开组
        this.command = {
            command: 'devContainerGroups.openGroup',
            title: '打开组',
            arguments: [this]
        };
    }
}
