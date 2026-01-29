import * as vscode from 'vscode';
import { ProjectManager, Project } from './projectManager';

export class ProjectsTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectTreeItem | undefined | null | void> = new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private projectManager: ProjectManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProjectTreeItem): Thenable<ProjectTreeItem[]> {
        if (!element) {
            const projects = this.projectManager.getAllProjects();
            return Promise.resolve(
                projects.map(project => new ProjectTreeItem(
                    project,
                    this.projectManager.isSelected(project.path)
                ))
            );
        }
        return Promise.resolve([]);
    }
}

export class ProjectTreeItem extends vscode.TreeItem {
    constructor(
        public readonly project: Project,
        public readonly isSelected: boolean
    ) {
        super(project.name, vscode.TreeItemCollapsibleState.None);

        this.tooltip = project.path;
        this.description = isSelected ? '✓' : '';
        this.contextValue = 'project';

        // 根据选中状态设置图标
        this.iconPath = new vscode.ThemeIcon(
            isSelected ? 'check' : 'circle-outline',
            isSelected ? new vscode.ThemeColor('charts.green') : undefined
        );

        // 点击切换选中状态
        this.command = {
            command: 'devContainerGroups.toggleProject',
            title: '切换选中状态',
            arguments: [this]
        };
    }
}
