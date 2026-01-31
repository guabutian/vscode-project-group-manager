import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

// 项目组合接口定义
export interface ProjectGroup {
    name: string; // 组合名称
    projects: string[]; // 项目路径列表
    weight?: number; // 权重分（用于排序，数字越大越靠前）
}

// 项目组合管理器类
export class GroupManager {
    private context: vscode.ExtensionContext;
    private groups: Map<string, ProjectGroup> = new Map(); // 组合映射表
    private saveQueue: NodeJS.Timeout | null = null; // 保存队列定时器
    private isSaving: boolean = false; // 是否正在保存

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadGroups();
    }

    // 获取组合配置文件路径
    private getGroupsConfigPath(): string | null {
        // 检查设置中的自定义路径
        const config = vscode.workspace.getConfiguration("projectGroups");
        const customPath = config.get<string>("groupsConfigPath");

        if (customPath && fs.existsSync(customPath)) {
            return customPath;
        }

        // 使用与 Project Manager 相同的目录结构
        const homeDir = os.homedir();
        const platform = process.platform;

        let configDir: string;

        if (platform === "darwin") {
            // macOS
            configDir = path.join(
                homeDir,
                "Library",
                "Application Support",
                "Code",
                "User",
                "globalStorage",
                "guabutian.project-group-manager",
            );
        } else if (platform === "win32") {
            // Windows
            configDir = path.join(
                homeDir,
                "AppData",
                "Roaming",
                "Code",
                "User",
                "globalStorage",
                "guabutian.project-group-manager",
            );
        } else {
            // Linux
            configDir = path.join(
                homeDir,
                ".config",
                "Code",
                "User",
                "globalStorage",
                "guabutian.project-group-manager",
            );
        }

        // 确保目录存在
        if (!fs.existsSync(configDir)) {
            try {
                fs.mkdirSync(configDir, { recursive: true });
            } catch (error) {
                vscode.window.showErrorMessage(
                    `创建配置目录失败: ${error}`,
                );
                return null;
            }
        }

        return path.join(configDir, "groups.json");
    }

    // 从文件系统加载组合
    private loadGroups(): void {
        this.groups.clear();

        // 先尝试从旧的 globalState 迁移数据
        this.migrateFromGlobalState();

        const configPath = this.getGroupsConfigPath();
        if (!configPath) {
            return;
        }

        // 如果文件不存在，创建空文件
        if (!fs.existsSync(configPath)) {
            try {
                fs.writeFileSync(configPath, JSON.stringify([], null, 4), "utf8");
            } catch (error) {
                vscode.window.showErrorMessage(
                    `创建组合配置文件失败: ${error}`,
                );
            }
            return;
        }

        try {
            const content = fs.readFileSync(configPath, "utf8");
            const saved = JSON.parse(content) as ProjectGroup[];

            for (const group of saved) {
                // 加载时去重，防止历史数据有重复
                const uniquePaths = Array.from(new Set(group.projects));
                this.groups.set(group.name, {
                    name: group.name,
                    projects: uniquePaths,
                    weight: group.weight,
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(
                `加载组合配置失败: ${error}`,
            );
        }
    }

    // 异步加载组合（用于未来优化）
    async loadGroupsAsync(): Promise<void> {
        this.groups.clear();

        // 先尝试从旧的 globalState 迁移数据
        this.migrateFromGlobalState();

        const configPath = this.getGroupsConfigPath();
        if (!configPath) {
            return;
        }

        // 如果文件不存在，创建空文件
        if (!fs.existsSync(configPath)) {
            try {
                await fs.promises.writeFile(configPath, JSON.stringify([], null, 4), "utf8");
            } catch (error) {
                vscode.window.showErrorMessage(
                    `创建组合配置文件失败: ${error}`,
                );
            }
            return;
        }

        try {
            const content = await fs.promises.readFile(configPath, "utf8");
            const saved = JSON.parse(content) as ProjectGroup[];

            for (const group of saved) {
                // 加载时去重，防止历史数据有重复
                const uniquePaths = Array.from(new Set(group.projects));
                this.groups.set(group.name, {
                    name: group.name,
                    projects: uniquePaths,
                    weight: group.weight,
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(
                `加载组合配置失败: ${error}`,
            );
        }
    }

    // 从旧的 globalState 迁移数据到文件系统
    private migrateFromGlobalState(): void {
        const oldData = this.context.globalState.get<ProjectGroup[]>(
            "projectGroups",
            [],
        );

        if (oldData.length > 0) {
            // 有旧数据，迁移到文件系统
            for (const group of oldData) {
                const uniquePaths = Array.from(new Set(group.projects));
                this.groups.set(group.name, {
                    name: group.name,
                    projects: uniquePaths,
                    weight: group.weight,
                });
            }

            // 保存到文件系统
            this.saveGroups();

            // 清除旧数据
            this.context.globalState.update("projectGroups", undefined);

            vscode.window.showInformationMessage(
                `已将 ${oldData.length} 个组合迁移到新的存储位置`,
            );
        }
    }

    // 调度保存操作（使用防抖机制）
    private scheduleSave(): void {
        // 清除之前的定时器
        if (this.saveQueue) {
            clearTimeout(this.saveQueue);
        }

        // 设置新的定时器，500ms 后执行保存
        this.saveQueue = setTimeout(() => {
            this.saveGroupsAsync();
            this.saveQueue = null;
        }, 500);
    }

    // 异步保存组合到文件系统
    private async saveGroupsAsync(): Promise<void> {
        // 如果正在保存，跳过
        if (this.isSaving) {
            return;
        }

        const configPath = this.getGroupsConfigPath();
        if (!configPath) {
            vscode.window.showErrorMessage("无法找到组合配置文件路径");
            return;
        }

        this.isSaving = true;
        try {
            const groupsArray = Array.from(this.groups.values());
            const content = JSON.stringify(groupsArray, null, 4);

            // 使用异步 API 写入文件
            await fs.promises.writeFile(configPath, content, "utf8");
        } catch (error) {
            vscode.window.showErrorMessage(
                `保存组合配置失败: ${error}`,
            );
        } finally {
            this.isSaving = false;
        }
    }

    // 同步保存组合到文件系统（保留用于向后兼容）
    private saveGroups(): void {
        this.scheduleSave();
    }

    // 获取所有组合（按权重分和名称排序）
    getAllGroups(): ProjectGroup[] {
        return Array.from(this.groups.values()).sort((a, b) => {
            // 首先按权重分降序排序（高分在前）
            const weightA = a.weight ?? 0;
            const weightB = b.weight ?? 0;
            if (weightA !== weightB) {
                return weightB - weightA;
            }
            // 权重分相同时，按名称字母顺序排序
            return a.name.localeCompare(b.name);
        });
    }

    // 获取指定名称的组合
    getGroup(name: string): ProjectGroup | undefined {
        return this.groups.get(name);
    }

    // 保存或更新组合
    saveGroup(name: string, projectPaths: string[], weight?: number): void {
        // 去重：使用 Set 去除重复的项目路径
        const uniquePaths = Array.from(new Set(projectPaths));

        this.groups.set(name, {
            name,
            projects: uniquePaths,
            weight: weight,
        });
        this.saveGroups();
    }

    // 删除组合
    deleteGroup(name: string): void {
        this.groups.delete(name);
        this.saveGroups();
    }

    // 重命名组合
    renameGroup(oldName: string, newName: string): boolean {
        if (this.groups.has(newName)) {
            vscode.window.showWarningMessage(`组名 "${newName}" 已存在`);
            return false;
        }

        const group = this.groups.get(oldName);
        if (!group) {
            return false;
        }

        // 删除旧的组
        this.groups.delete(oldName);

        // 创建新的组
        this.groups.set(newName, {
            name: newName,
            projects: group.projects,
            weight: group.weight,
        });

        this.saveGroups();
        return true;
    }

    // 更新组合的项目列表
    updateGroup(name: string, projectPaths: string[]): void {
        const group = this.groups.get(name);
        if (group) {
            // 去重：使用 Set 去除重复的项目路径
            group.projects = Array.from(new Set(projectPaths));
            this.saveGroups();
        }
    }

    // 设置组合的权重分
    setGroupWeight(name: string, weight: number): void {
        const group = this.groups.get(name);
        if (group) {
            group.weight = weight;
            this.saveGroups();
        }
    }

    // 从组合中移除项目
    removeProjectFromGroup(groupName: string, projectPath: string): void {
        const group = this.groups.get(groupName);
        if (group) {
            group.projects = group.projects.filter(
                (path) => path !== projectPath,
            );
            this.saveGroups();
        }
    }

    // 向组合中添加项目
    addProjectToGroup(groupName: string, projectPath: string): void {
        const group = this.groups.get(groupName);
        if (group) {
            // 检查项目是否已经在组合中
            if (!group.projects.includes(projectPath)) {
                group.projects.push(projectPath);
                this.saveGroups();
            }
        }
    }

    // 清空所有组合
    clearAllGroups(): void {
        this.groups.clear();
        this.saveGroups();
    }

    // 获取配置文件路径（用于打开配置文件）
    getConfigPath(): string | null {
        return this.getGroupsConfigPath();
    }
}
