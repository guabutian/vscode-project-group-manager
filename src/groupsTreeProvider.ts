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
                groups.map(group => {
                    // 计算组内选中的项目数量
                    const selectedCount = group.projects.filter(path =>
                        this.projectManager.isSelected(path)
                    ).length;
                    return new GroupTreeItem(group, selectedCount);
                })
            );
        } else if (element instanceof GroupTreeItem) {
            // 返回组内的项目
            const allProjects = this.projectManager.getAllProjects();
            const projectItems = element.group.projects
                .map(projectPath => {
                    const project = allProjects.find(p => p.path === projectPath);
                    if (!project) {return null;}
                    const isSelected = this.projectManager.isSelected(projectPath);
                    return new ProjectInGroupItem(project, element.group.name, isSelected);
                })
                .filter((item): item is ProjectInGroupItem => item !== null);

            return Promise.resolve(projectItems);
        }

        return Promise.resolve([]);
    }
}

export class GroupTreeItem extends vscode.TreeItem {
    constructor(
        public readonly group: ProjectGroup,
        public readonly selectedCount: number = 0
    ) {
        super(group.name, vscode.TreeItemCollapsibleState.Collapsed);

        this.tooltip = this.buildTooltip();
        this.description = this.buildDescription();
        this.contextValue = 'group';

        // 根据选中状态设置图标
        this.iconPath = this.getIcon();

        // 双击打开组
        this.command = {
            command: 'devContainerGroups.openGroup',
            title: '打开组',
            arguments: [this]
        };
    }

    private getIcon(): vscode.ThemeIcon {
        // 如果有选中的项目，显示勾选图标
        if (this.selectedCount > 0) {
            return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        }

        // 所有组都使用 package 图标 (📦)
        return new vscode.ThemeIcon('package');
    }

    private buildDescription(): string {
        if (this.selectedCount > 0) {
            return `✓ ${this.selectedCount}/${this.group.projects.length} 个项目`;
        }
        return `${this.group.projects.length} 个项目`;
    }

    private buildTooltip(): string {
        const lines: string[] = [];
        lines.push(`组名: ${this.group.name}`);
        lines.push(`总项目数: ${this.group.projects.length}`);
        if (this.selectedCount > 0) {
            lines.push(`已选中: ${this.selectedCount} 个项目`);
        }
        return lines.join('\n');
    }
}

export class ProjectInGroupItem extends vscode.TreeItem {
    constructor(
        public readonly project: any,
        public readonly groupName: string,
        public readonly isSelected: boolean
    ) {
        super(project.name, vscode.TreeItemCollapsibleState.None);

        this.tooltip = this.buildTooltip();
        this.description = this.buildDescription();
        this.contextValue = 'projectInGroup';

        // 根据项目类型和选中状态设置图标
        this.iconPath = this.getIconForProject();

        // 点击切换选中状态
        this.command = {
            command: 'devContainerGroups.toggleProject',
            title: '切换选中状态',
            arguments: [this]
        };
    }

    private getIconForProject(): vscode.ThemeIcon {
        // 如果已选中，使用勾选图标
        if (this.isSelected) {
            return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        }

        // 根据项目类型返回不同图标
        switch (this.project.type) {
            case 'dev-container':
                return new vscode.ThemeIcon('server-environment', new vscode.ThemeColor('charts.blue'));
            case 'ssh-remote':
                return new vscode.ThemeIcon('vm', new vscode.ThemeColor('charts.orange'));
            case 'wsl':
                return new vscode.ThemeIcon('terminal-linux', new vscode.ThemeColor('charts.purple'));
            case 'local':
                return new vscode.ThemeIcon('folder');
            default:
                return new vscode.ThemeIcon('question', new vscode.ThemeColor('charts.gray'));
        }
    }

    private buildDescription(): string {
        const parts: string[] = [];

        // 选中标记
        if (this.isSelected) {
            parts.push('✓');
        }

        // 不再显示类型标签

        return parts.join(' ');
    }

    private getTypeLabel(): string {
        switch (this.project.type) {
            case 'dev-container':
                return '🐳 Dev Container';
            case 'ssh-remote':
                return '🖥️ SSH Remote';
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

        if (this.isSelected) {
            lines.push('');
            lines.push('✓ 已选中');
        }

        return lines.join('\n');
    }
}
