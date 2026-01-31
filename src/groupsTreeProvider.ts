import * as vscode from "vscode";
import { GroupManager, ProjectGroup } from "./groupManager";
import { ProjectManager } from "./projectManager";

// 组合列表树视图提供器
export class GroupsTreeProvider implements vscode.TreeDataProvider<
    GroupTreeItem | ProjectInGroupItem
> {
    // 树数据变化事件发射器
    private _onDidChangeTreeData: vscode.EventEmitter<
        GroupTreeItem | ProjectInGroupItem | undefined | null | void
    > = new vscode.EventEmitter<
        GroupTreeItem | ProjectInGroupItem | undefined | null | void
    >();
    readonly onDidChangeTreeData: vscode.Event<
        GroupTreeItem | ProjectInGroupItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    // 防抖定时器
    private refreshDebounceTimer: NodeJS.Timeout | null = null;
    private readonly REFRESH_DEBOUNCE_MS = 100; // 100ms 防抖延迟

    constructor(
        private groupManager: GroupManager,
        private projectManager: ProjectManager,
    ) {}

    // 刷新树视图（带防抖）
    refresh(): void {
        // 清除之前的定时器
        if (this.refreshDebounceTimer) {
            clearTimeout(this.refreshDebounceTimer);
        }

        // 设置新的定时器
        this.refreshDebounceTimer = setTimeout(() => {
            this._onDidChangeTreeData.fire();
            this.refreshDebounceTimer = null;
        }, this.REFRESH_DEBOUNCE_MS);
    }

    // 立即刷新（不使用防抖）
    refreshImmediate(): void {
        if (this.refreshDebounceTimer) {
            clearTimeout(this.refreshDebounceTimer);
            this.refreshDebounceTimer = null;
        }
        this._onDidChangeTreeData.fire();
    }

    // 获取树项
    getTreeItem(element: GroupTreeItem | ProjectInGroupItem): vscode.TreeItem {
        return element;
    }

    // 获取子节点
    getChildren(
        element?: GroupTreeItem | ProjectInGroupItem,
    ): Thenable<(GroupTreeItem | ProjectInGroupItem)[]> {
        if (!element) {
            // 根节点：返回所有组合
            const groups = this.groupManager.getAllGroups();
            return Promise.resolve(
                groups.map((group) => {
                    // 计算组内选中的项目数量
                    const selectedCount = group.projects.filter((path) =>
                        this.projectManager.isSelected(path),
                    ).length;
                    return new GroupTreeItem(group, selectedCount);
                }),
            );
        } else if (element instanceof GroupTreeItem) {
            // 展开组合：返回组内的项目
            const allProjects = this.projectManager.getAllProjects();

            // 创建项目路径到项目对象的映射，优化查找性能（O(1) 而不是 O(n)）
            const projectMap = new Map(allProjects.map(p => [p.path, p]));

            const projectItems = element.group.projects
                .map((projectPath) => {
                    // 使用 Map 进行 O(1) 查找
                    const project = projectMap.get(projectPath);
                    if (!project) {
                        return null;
                    }
                    const isSelected =
                        this.projectManager.isSelected(projectPath);
                    return new ProjectInGroupItem(
                        project,
                        element.group.name,
                        isSelected,
                    );
                })
                .filter((item): item is ProjectInGroupItem => item !== null);

            return Promise.resolve(projectItems);
        }

        return Promise.resolve([]);
    }
}

// 组合树项
export class GroupTreeItem extends vscode.TreeItem {
    constructor(
        public readonly group: ProjectGroup,
        public readonly selectedCount: number = 0,
    ) {
        super(group.name, vscode.TreeItemCollapsibleState.Collapsed);

        this.tooltip = this.buildTooltip();
        this.description = this.buildDescription();
        this.contextValue = "group";

        // 根据选中状态设置图标
        this.iconPath = this.getIcon();
    }

    // 获取图标（根据选中状态）
    private getIcon(): vscode.ThemeIcon {
        // 如果有选中的项目，显示勾选图标
        if (this.selectedCount > 0) {
            return new vscode.ThemeIcon(
                "check",
                new vscode.ThemeColor("charts.green"),
            );
        }

        // 所有组都使用 package 图标
        return new vscode.ThemeIcon("package");
    }

    // 构建描述文本（显示在组名右侧）
    private buildDescription(): string {
        const parts: string[] = [];

        // 显示选中状态
        if (this.selectedCount > 0) {
            parts.push(
                `✓ ${this.selectedCount}/${this.group.projects.length} 个项目`,
            );
        } else {
            parts.push(`${this.group.projects.length} 个项目`);
        }

        // 显示权重分（仅当权重分大于0时）
        const weight = this.group.weight ?? 0;
        if (weight > 0) {
            parts.push(`⭐${weight}`);
        }

        return parts.join(" ");
    }

    // 构建提示文本（鼠标悬停时显示）
    private buildTooltip(): string {
        const lines: string[] = [];
        lines.push(`组名: ${this.group.name}`);
        lines.push(`总项目数: ${this.group.projects.length}`);
        if (this.selectedCount > 0) {
            lines.push(`已选中: ${this.selectedCount} 个项目`);
        }
        const weight = this.group.weight ?? 0;
        if (weight > 0) {
            lines.push(`权重分: ${weight}`);
        }
        return lines.join("\n");
    }
}

// 组内项目树项
export class ProjectInGroupItem extends vscode.TreeItem {
    constructor(
        public readonly project: any,
        public readonly groupName: string,
        public readonly isSelected: boolean,
    ) {
        super(project.name, vscode.TreeItemCollapsibleState.None);

        this.tooltip = this.buildTooltip();
        this.description = this.buildDescription();
        this.contextValue = "projectInGroup";

        // 根据项目类型和选中状态设置图标
        this.iconPath = this.getIconForProject();

        // 点击切换选中状态
        this.command = {
            command: "projectGroupManager.toggleProject",
            title: "切换选中状态",
            arguments: [this],
        };
    }

    // 获取项目图标（根据类型和选中状态）
    private getIconForProject(): vscode.ThemeIcon {
        // 如果已选中，使用勾选图标
        if (this.isSelected) {
            return new vscode.ThemeIcon(
                "check",
                new vscode.ThemeColor("charts.green"),
            );
        }

        // 根据项目类型返回不同图标
        switch (this.project.type) {
            case "dev-container":
                return new vscode.ThemeIcon(
                    "server-environment",
                    new vscode.ThemeColor("charts.blue"),
                );
            case "ssh-remote":
                return new vscode.ThemeIcon(
                    "vm",
                    new vscode.ThemeColor("charts.orange"),
                );
            case "wsl":
                return new vscode.ThemeIcon(
                    "terminal-linux",
                    new vscode.ThemeColor("charts.purple"),
                );
            case "local":
                return new vscode.ThemeIcon("folder");
            default:
                return new vscode.ThemeIcon(
                    "question",
                    new vscode.ThemeColor("charts.gray"),
                );
        }
    }

    // 构建描述文本（显示在项目名右侧）
    private buildDescription(): string {
        const parts: string[] = [];

        // 选中标记
        if (this.isSelected) {
            parts.push("✓");
        }

        return parts.join(" ");
    }

    // 获取项目类型标签
    private getTypeLabel(): string {
        switch (this.project.type) {
            case "dev-container":
                return "🐳 Dev Container";
            case "ssh-remote":
                return "🖥️ SSH Remote";
            case "wsl":
                return "🐧 WSL";
            case "local":
                return "📁 本地";
            default:
                return "❓ 未知";
        }
    }

    // 构建提示文本（鼠标悬停时显示）
    private buildTooltip(): string {
        const lines: string[] = [];
        lines.push(`名称: ${this.project.name}`);
        lines.push(`类型: ${this.getTypeLabel()}`);
        lines.push(`路径: ${this.project.path}`);
        lines.push(`所属组: ${this.groupName}`);

        if (this.isSelected) {
            lines.push("");
            lines.push("✓ 已选中");
        }

        return lines.join("\n");
    }
}
