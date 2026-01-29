import * as vscode from 'vscode';
import { GroupManager, ProjectGroup } from './groupManager';
import { ProjectManager } from './projectManager';

export class GroupsTreeProvider implements vscode.TreeDataProvider<GroupTreeItem | ProjectInGroupItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GroupTreeItem | ProjectInGroupItem | undefined | null | void> = new vscode.EventEmitter<GroupTreeItem | ProjectInGroupItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GroupTreeItem | ProjectInGroupItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private groupManager: GroupManager,
        private projectManager: ProjectManager
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GroupTreeItem | ProjectInGroupItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GroupTreeItem | ProjectInGroupItem): Thenable<(GroupTreeItem | ProjectInGroupItem)[]> {
        if (!element) {
            // 返回所有组
            const groups = this.groupManager.getAllGroups();
            return Promise.resolve(
                groups.map(group => new GroupTreeItem(group))
            );
        } else if (element instanceof GroupTreeItem) {
            // 返回组内的项目
            const allProjects = this.projectManager.getAllProjects();
            const projectItems = element.group.projects
                .map(projectPath => {
                    const project = allProjects.find(p => p.path === projectPath);
                    return project ? new ProjectInGroupItem(project, element.group.name) : null;
                })
                .filter((item): item is ProjectInGroupItem => item !== null);

            return Promise.resolve(projectItems);
        }

        return Promise.resolve([]);
    }
}

export class GroupTreeItem extends vscode.TreeItem {
    constructor(public readonly group: ProjectGroup) {
        super(group.name, vscode.TreeItemCollapsibleState.Collapsed);

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

export class ProjectInGroupItem extends vscode.TreeItem {
    constructor(
        public readonly project: any,
        public readonly groupName: string
    ) {
        super(project.name, vscode.TreeItemCollapsibleState.None);

        this.tooltip = this.buildTooltip();
        this.description = this.getTypeLabel();
        this.contextValue = 'projectInGroup';

        // 根据项目类型设置图标
        this.iconPath = this.getIconForProject();
    }

    private getIconForProject(): vscode.ThemeIcon {
        switch (this.project.type) {
            case 'dev-container':
                return new vscode.ThemeIcon('server-environment', new vscode.ThemeColor('charts.blue'));
            case 'ssh-remote':
                return new vscode.ThemeIcon('remote', new vscode.ThemeColor('charts.orange'));
            case 'wsl':
                return new vscode.ThemeIcon('terminal-linux', new vscode.ThemeColor('charts.purple'));
            case 'local':
                return new vscode.ThemeIcon('folder');
            default:
                return new vscode.ThemeIcon('question', new vscode.ThemeColor('charts.gray'));
        }
    }

    private getTypeLabel(): string {
        switch (this.project.type) {
            case 'dev-container':
                return '🐳 Dev Container';
            case 'ssh-remote':
                return '🔗 SSH Remote';
            case 'wsl':
                return '🐧 WSL';
            case 'local':
                return '📁 本地';
            default:
                return '❓ 未知';
        }
    }

    private buildTooltip(): string {
        const lines: string[] = [];
        lines.push(`名称: ${this.project.name}`);
        lines.push(`类型: ${this.getTypeLabel()}`);
        lines.push(`路径: ${this.project.path}`);
        lines.push(`所属组: ${this.groupName}`);
        return lines.join('\n');
    }
}
