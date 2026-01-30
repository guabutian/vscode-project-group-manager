import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

// 项目接口定义
export interface Project {
    name: string; // 项目名称
    path: string; // 项目路径
    type: "local" | "ssh-remote" | "dev-container" | "wsl" | "unknown"; // 项目类型
    paths?: string[]; // 多路径项目
    tags?: string[]; // 项目标签
    enabled?: boolean; // 是否启用
    profile?: string; // 配置文件
}

// 项目管理器类
export class ProjectManager {
    private projects: Project[] = []; // 所有项目列表
    private selectedPaths: Set<string> = new Set(); // 选中的项目路径集合
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadProjects();
    }

    // 加载项目列表
    async loadProjects(): Promise<void> {
        this.projects = [];

        // 从 Project Manager 加载项目
        const projectManagerProjects = await this.loadFromProjectManager();

        // 使用 Map 根据 path 去重
        const projectMap = new Map<string, Partial<Project>>();

        for (const project of projectManagerProjects) {
            if (!project.name || !project.path) {
                continue; // 跳过无效项目
            }

            // 保留后出现的项目（覆盖之前的）
            projectMap.set(project.path, project);
        }

        // 为每个项目识别类型
        for (const project of projectMap.values()) {
            const projectType = this.detectProjectType(project.path!);

            this.projects.push({
                name: project.name!,
                path: project.path!,
                type: projectType,
                paths: project.paths || [],
                tags: project.tags || [],
                enabled: project.enabled !== undefined ? project.enabled : true,
                profile: project.profile || "",
            });
        }

        // 按名称排序
        this.projects.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 从 Project Manager 配置文件加载项目
    private async loadFromProjectManager(): Promise<Partial<Project>[]> {
        const projects: Partial<Project>[] = [];

        // 查找 Project Manager 配置文件
        const configPath = this.getProjectManagerConfigPath();

        if (!configPath || !fs.existsSync(configPath)) {
            vscode.window.showWarningMessage(
                "未找到 Project Manager 配置。请安装 Project Manager 扩展。",
            );
            return projects;
        }

        try {
            const content = fs.readFileSync(configPath, "utf8");
            const config = JSON.parse(content);

            // 解析项目配置（支持旧格式）
            if (Array.isArray(config)) {
                for (const item of config) {
                    if (item.rootPath) {
                        projects.push({
                            name: item.name || path.basename(item.rootPath),
                            path: item.rootPath,
                            paths: item.paths || [],
                            tags: item.tags || [],
                            enabled:
                                item.enabled !== undefined
                                    ? item.enabled
                                    : true,
                            profile: item.profile || "",
                        });
                    }
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(
                `加载 Project Manager 配置失败: ${error}`,
            );
        }

        return projects;
    }

    // 获取 Project Manager 配置文件路径
    private getProjectManagerConfigPath(): string | null {
        // 检查设置中的自定义路径
        const config = vscode.workspace.getConfiguration("projectGroups");
        const customPath = config.get<string>("projectManagerPath");

        if (customPath && fs.existsSync(customPath)) {
            return customPath;
        }

        // 根据平台自动检测
        const homeDir = os.homedir();
        const possiblePaths = [
            // VS Code
            path.join(
                homeDir,
                ".config",
                "Code",
                "User",
                "globalStorage",
                "alefragnani.project-manager",
                "projects.json",
            ),
            // VS Code Insiders
            path.join(
                homeDir,
                ".config",
                "Code - Insiders",
                "User",
                "globalStorage",
                "alefragnani.project-manager",
                "projects.json",
            ),
            // macOS
            path.join(
                homeDir,
                "Library",
                "Application Support",
                "Code",
                "User",
                "globalStorage",
                "alefragnani.project-manager",
                "projects.json",
            ),
            // Windows
            path.join(
                homeDir,
                "AppData",
                "Roaming",
                "Code",
                "User",
                "globalStorage",
                "alefragnani.project-manager",
                "projects.json",
            ),
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }

    // 检测项目类型（根据路径前缀判断）
    private detectProjectType(projectPath: string): Project["type"] {
        // Dev Container 远程项目
        if (projectPath.startsWith("vscode-remote://dev-container+")) {
            return "dev-container";
        }

        // SSH Remote 项目
        if (projectPath.startsWith("vscode-remote://ssh-remote+")) {
            return "ssh-remote";
        }

        // WSL 项目
        if (projectPath.startsWith("vscode-remote://wsl+")) {
            return "wsl";
        }

        // 其他远程类型
        if (projectPath.startsWith("vscode-remote://")) {
            return "unknown";
        }

        // 本地项目
        return "local";
    }

    // 获取所有项目
    getAllProjects(): Project[] {
        return this.projects;
    }

    // 获取选中的项目
    getSelectedProjects(): Project[] {
        return this.projects.filter((p) => this.selectedPaths.has(p.path));
    }

    // 检查项目是否被选中
    isSelected(projectPath: string): boolean {
        return this.selectedPaths.has(projectPath);
    }

    // 切换项目选中状态
    toggleSelection(projectPath: string): void {
        if (this.selectedPaths.has(projectPath)) {
            this.selectedPaths.delete(projectPath);
        } else {
            this.selectedPaths.add(projectPath);
        }
    }

    // 清除所有选中
    clearSelection(): void {
        this.selectedPaths.clear();
    }

    // 重命名项目
    renameProject(oldPath: string, newName: string): boolean {
        const project = this.projects.find((p) => p.path === oldPath);
        if (!project) {
            return false;
        }

        // 检查新名称是否已存在
        if (
            this.projects.some((p) => p.name === newName && p.path !== oldPath)
        ) {
            vscode.window.showWarningMessage(`项目名称 "${newName}" 已存在`);
            return false;
        }

        // 更新项目名称
        project.name = newName;

        // 保存到 Project Manager 配置
        this.saveToProjectManager();

        return true;
    }

    // 删除项目
    deleteProject(projectPath: string): boolean {
        const index = this.projects.findIndex((p) => p.path === projectPath);
        if (index === -1) {
            return false;
        }

        // 从列表中删除
        this.projects.splice(index, 1);

        // 从选中列表中删除
        this.selectedPaths.delete(projectPath);

        // 保存到 Project Manager 配置
        this.saveToProjectManager();

        return true;
    }

    // 保存项目列表到 Project Manager 配置文件
    private saveToProjectManager(): void {
        const configPath = this.getProjectManagerConfigPath();
        if (!configPath) {
            vscode.window.showErrorMessage("无法找到 Project Manager 配置文件");
            return;
        }

        try {
            // 转换为 Project Manager 格式
            const config = this.projects.map((project) => ({
                name: project.name,
                rootPath: project.path,
                paths: project.paths || [],
                tags: project.tags || [],
                enabled: project.enabled !== undefined ? project.enabled : true,
                profile: project.profile || "",
            }));

            fs.writeFileSync(
                configPath,
                JSON.stringify(config, null, 4),
                "utf8",
            );
        } catch (error) {
            vscode.window.showErrorMessage(
                `保存 Project Manager 配置失败: ${error}`,
            );
        }
    }

    // 清理重复的项目（根据路径去重）
    cleanDuplicates(): number {
        const configPath = this.getProjectManagerConfigPath();
        if (!configPath) {
            return 0;
        }

        try {
            const content = fs.readFileSync(configPath, "utf8");
            const config = JSON.parse(content);

            if (!Array.isArray(config)) {
                return 0;
            }

            // 使用 Map 根据 rootPath 去重
            const projectMap = new Map<string, any>();
            let duplicateCount = 0;

            for (const item of config) {
                if (item.rootPath) {
                    if (projectMap.has(item.rootPath)) {
                        duplicateCount++;
                    }
                    // 保留后出现的（最新的）
                    projectMap.set(item.rootPath, item);
                }
            }

            if (duplicateCount > 0) {
                // 保存去重后的配置
                const cleanedConfig = Array.from(projectMap.values());
                fs.writeFileSync(
                    configPath,
                    JSON.stringify(cleanedConfig, null, 4),
                    "utf8",
                );
            }

            return duplicateCount;
        } catch (error) {
            vscode.window.showErrorMessage(`清理重复项目失败: ${error}`);
            return 0;
        }
    }

    // 获取配置文件路径
    getConfigPath(): string | null {
        return this.getProjectManagerConfigPath();
    }
}
