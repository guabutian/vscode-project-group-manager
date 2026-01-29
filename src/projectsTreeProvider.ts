import * as vscode from 'vscode';
import { ProjectManager, Project } from './projectManager';

export type ViewMode = 'flat' | 'by-type' | 'by-path';

export class ProjectsTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem | GroupTreeItem | PathGroupTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectTreeItem | GroupTreeItem | PathGroupTreeItem | undefined | null | void> = new vscode.EventEmitter<ProjectTreeItem | GroupTreeItem | PathGroupTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectTreeItem | GroupTreeItem | PathGroupTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private viewMode: ViewMode = 'flat';
    private context: vscode.ExtensionContext;

    constructor(
        private projectManager: ProjectManager,
        context: vscode.ExtensionContext
    ) {
        this.context = context;
        // 从持久化存储中加载上次的显示模式
        this.viewMode = this.context.globalState.get<ViewMode>('projectsViewMode', 'flat');
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setViewMode(mode: ViewMode): void {
        this.viewMode = mode;
        // 保存到持久化存储
        this.context.globalState.update('projectsViewMode', mode);
        this.refresh();
    }

    getViewMode(): ViewMode {
        return this.viewMode;
    }

    getTreeItem(element: ProjectTreeItem | GroupTreeItem | PathGroupTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProjectTreeItem | GroupTreeItem | PathGroupTreeItem): Thenable<(ProjectTreeItem | GroupTreeItem | PathGroupTreeItem)[]> {
        if (!element) {
            // 根节点
            const projects = this.projectManager.getAllProjects();

            if (this.viewMode === 'flat') {
                // 平铺展示
                return Promise.resolve(
                    projects.map(project => new ProjectTreeItem(
                        project,
                        this.projectManager.isSelected(project.path)
                    ))
                );
            } else if (this.viewMode === 'by-type') {
                // 按类型分组
                return Promise.resolve(this.groupByType(projects));
            } else if (this.viewMode === 'by-path') {
                // 按路径分组
                return Promise.resolve(this.groupByPath(projects));
            }
        } else if (element instanceof GroupTreeItem) {
            // 展开分组，显示组内项目
            return Promise.resolve(
                element.projects.map(project => new ProjectTreeItem(
                    project,
                    this.projectManager.isSelected(project.path)
                ))
            );
        } else if (element instanceof PathGroupTreeItem) {
            // 展开路径分组
            const items: (PathGroupTreeItem | ProjectTreeItem)[] = [];

            // 添加子节点（文件夹）
            for (const [name, childNode] of element.pathNode.children) {
                const allProjects = this.collectAllProjects(childNode);
                items.push(new PathGroupTreeItem(
                    name,
                    allProjects,
                    childNode
                ));
            }

            // 添加当前节点的项目
            for (const project of element.pathNode.projects) {
                items.push(new ProjectTreeItem(
                    project,
                    this.projectManager.isSelected(project.path)
                ));
            }

            return Promise.resolve(items);
        }

        return Promise.resolve([]);
    }

    private groupByType(projects: Project[]): GroupTreeItem[] {
        const groups = new Map<string, Project[]>();

        for (const project of projects) {
            const type = project.type;
            if (!groups.has(type)) {
                groups.set(type, []);
            }
            groups.get(type)!.push(project);
        }

        const typeOrder = ['local', 'dev-container', 'ssh-remote', 'wsl', 'unknown'];
        const typeLabels: Record<string, string> = {
            'local': '本地',
            'dev-container': 'Dev Container',
            'ssh-remote': 'SSH Remote',
            'wsl': 'WSL',
            'unknown': '未知'
        };

        return typeOrder
            .filter(type => groups.has(type))
            .map(type => new GroupTreeItem(
                typeLabels[type] || type,
                groups.get(type)!,
                type
            ));
    }

    private groupByPath(projects: Project[]): (PathGroupTreeItem | ProjectTreeItem)[] {
        // 构建树形结构
        const root = new PathNode('', '');

        for (const project of projects) {
            const parts = project.name.split('/');
            let current = root;
            let currentPath = '';

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLast = i === parts.length - 1;

                if (isLast) {
                    // 最后一个部分，添加项目
                    current.projects.push(project);
                } else {
                    // 中间部分，创建或获取子节点
                    if (!current.children.has(part)) {
                        current.children.set(part, new PathNode(part, currentPath));
                    }
                    current = current.children.get(part)!;
                    currentPath = current.fullPath;
                }
            }
        }

        // 转换为 TreeItem
        return this.pathNodeToTreeItems(root);
    }

    private pathNodeToTreeItems(node: PathNode): (PathGroupTreeItem | ProjectTreeItem)[] {
        const items: (PathGroupTreeItem | ProjectTreeItem)[] = [];

        // 添加子节点（文件夹）
        for (const [name, childNode] of node.children) {
            const allProjects = this.collectAllProjects(childNode);
            items.push(new PathGroupTreeItem(
                name,
                allProjects,
                childNode
            ));
        }

        // 添加当前节点的项目
        for (const project of node.projects) {
            items.push(new ProjectTreeItem(
                project,
                this.projectManager.isSelected(project.path)
            ));
        }

        return items;
    }

    private collectAllProjects(node: PathNode): Project[] {
        const projects: Project[] = [...node.projects];

        for (const childNode of node.children.values()) {
            projects.push(...this.collectAllProjects(childNode));
        }

        return projects;
    }
}

class PathNode {
    children: Map<string, PathNode> = new Map();
    projects: Project[] = [];
    fullPath: string = ''; // 存储完整路径

    constructor(public name: string, parentPath: string = '') {
        // 计算完整路径
        if (parentPath) {
            this.fullPath = parentPath + '/' + name;
        } else {
            this.fullPath = name;
        }
    }
}

export class GroupTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly projects: Project[],
        public readonly groupType: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);

        this.tooltip = `${projects.length} 个项目`;
        this.description = `${projects.length} 个项目`;
        this.contextValue = 'projectGroup';

        // 根据分组类型设置图标 - 不使用 emoji，只用 VS Code 图标
        if (groupType === 'local') {
            this.iconPath = new vscode.ThemeIcon('folder');
        } else if (groupType === 'dev-container') {
            this.iconPath = new vscode.ThemeIcon('server-environment', new vscode.ThemeColor('charts.blue'));
        } else if (groupType === 'ssh-remote') {
            this.iconPath = new vscode.ThemeIcon('vm', new vscode.ThemeColor('charts.orange'));
        } else if (groupType === 'wsl') {
            this.iconPath = new vscode.ThemeIcon('terminal-linux', new vscode.ThemeColor('charts.purple'));
        } else if (groupType === 'host') {
            this.iconPath = new vscode.ThemeIcon('server');
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}

export class PathGroupTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly projects: Project[],
        public readonly pathNode: PathNode
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);

        this.tooltip = `${projects.length} 个项目`;
        this.description = `${projects.length} 个项目`;
        this.contextValue = 'pathGroup';
        this.iconPath = new vscode.ThemeIcon('folder');
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
                // Dev Container: 使用 🐳
                return new vscode.ThemeIcon('server-environment', new vscode.ThemeColor('charts.blue'));

            case 'ssh-remote':
                // SSH Remote: 使用 🖥️
                return new vscode.ThemeIcon('vm', new vscode.ThemeColor('charts.orange'));

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
        // 只显示选中标记，不显示类型标签
        if (this.isSelected) {
            return '✓';
        }
        return '';
    }

    /**
     * 获取项目类型标签
     */
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
