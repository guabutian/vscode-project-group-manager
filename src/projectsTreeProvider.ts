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

        this.tooltip = this.buildTooltip();
        this.description = this.buildDescription();
        this.contextValue = 'project';

        // 根据项目类型和选中状态设置图标
        this.iconPath = this.getIconForProject();

        // 点击切换选中状态
        this.command = {
            command: 'devContainerGroups.toggleProject',
            title: '切换选中状态',
            arguments: [this]
        };
    }

    /**
     * 根据项目类型获取图标
     */
    private getIconForProject(): vscode.ThemeIcon {
        // 如果已选中，使用勾选图标
        if (this.isSelected) {
            return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        }

        // 根据项目类型返回不同图标
        switch (this.project.type) {
            case 'dev-container':
                // Dev Container: 容器图标（蓝色）
                return new vscode.ThemeIcon('server-environment', new vscode.ThemeColor('charts.blue'));

            case 'ssh-remote':
                // SSH Remote: 远程图标（橙色）
                return new vscode.ThemeIcon('remote', new vscode.ThemeColor('charts.orange'));

            case 'wsl':
                // WSL: Linux 图标（紫色）
                return new vscode.ThemeIcon('terminal-linux', new vscode.ThemeColor('charts.purple'));

            case 'local':
                // 本地项目: 文件夹图标（默认颜色）
                return new vscode.ThemeIcon('folder');

            default:
                // 未知类型: 问号图标（灰色）
                return new vscode.ThemeIcon('question', new vscode.ThemeColor('charts.gray'));
        }
    }

    /**
     * 构建项目描述（显示在项目名称右侧）
     */
    private buildDescription(): string {
        const parts: string[] = [];

        // 选中标记
        if (this.isSelected) {
            parts.push('✓');
        }

        // 项目类型标签
        const typeLabel = this.getTypeLabel();
        if (typeLabel) {
            parts.push(typeLabel);
        }

        return parts.join(' ');
    }

    /**
     * 获取项目类型标签
     */
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

    /**
     * 构建 tooltip（鼠标悬停提示）
     */
    private buildTooltip(): string {
        const lines: string[] = [];

        lines.push(`名称: ${this.project.name}`);
        lines.push(`类型: ${this.getTypeLabel()}`);
        lines.push(`路径: ${this.project.path}`);

        if (this.isSelected) {
            lines.push('');
            lines.push('✓ 已选中');
        }

        return lines.join('\n');
    }
}
