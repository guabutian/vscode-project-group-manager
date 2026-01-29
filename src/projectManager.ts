import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export interface Project {
    name: string;
    path: string;
    type: 'local' | 'ssh-remote' | 'dev-container' | 'wsl' | 'unknown';
    hasDevContainer: boolean;
}

export class ProjectManager {
    private projects: Project[] = [];
    private selectedPaths: Set<string> = new Set();
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadProjects();
    }

    async loadProjects(): Promise<void> {
        this.projects = [];

        // 尝试从 Project Manager 加载项目
        const projectManagerProjects = await this.loadFromProjectManager();

        // 为每个项目识别类型
        for (const project of projectManagerProjects) {
            if (!project.name || !project.path) {
                continue; // 跳过无效项目
            }

            const projectType = this.detectProjectType(project.path);
            const hasDevContainer = projectType === 'dev-container';

            this.projects.push({
                name: project.name,
                path: project.path,
                type: projectType,
                hasDevContainer: hasDevContainer,
            });
        }

        // 按名称排序
        this.projects.sort((a, b) => a.name.localeCompare(b.name));
    }

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

            // 解析不同格式的项目配置
            if (Array.isArray(config)) {
                // 旧格式：项目数组
                for (const item of config) {
                    if (item.rootPath) {
                        projects.push({
                            name: item.name || path.basename(item.rootPath),
                            path: item.rootPath,
                            hasDevContainer: false,
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

    private hasDevContainer(projectPath: string): boolean {
        if (!fs.existsSync(projectPath)) {
            return false;
        }

        const devcontainerPath = path.join(projectPath, ".devcontainer");
        if (!fs.existsSync(devcontainerPath)) {
            return false;
        }

        // 检查是否存在 devcontainer.json 或 docker-compose.yml
        const devcontainerJson = path.join(
            devcontainerPath,
            "devcontainer.json",
        );
        const dockerCompose = path.join(devcontainerPath, "docker-compose.yml");

        return fs.existsSync(devcontainerJson) || fs.existsSync(dockerCompose);
    }

    /**
     * 检测项目类型
     * @param projectPath 项目路径
     * @returns 项目类型
     */
    private detectProjectType(projectPath: string): Project['type'] {
        // Dev Container 远程项目
        if (projectPath.startsWith("vscode-remote://dev-container+")) {
            return 'dev-container';
        }

        // SSH Remote 项目
        if (projectPath.startsWith("vscode-remote://ssh-remote+")) {
            return 'ssh-remote';
        }

        // WSL 项目
        if (projectPath.startsWith("vscode-remote://wsl+")) {
            return 'wsl';
        }

        // 其他远程类型
        if (projectPath.startsWith("vscode-remote://")) {
            return 'unknown';
        }

        // 本地项目
        return 'local';
    }

    /**
     * 判断是否为 Dev Container 项目（已废弃，保留用于兼容）
     */
    private isDevContainerProject(projectPath: string): boolean {
        return this.detectProjectType(projectPath) === 'dev-container';
    }

    getAllProjects(): Project[] {
        return this.projects;
    }

    getSelectedProjects(): Project[] {
        return this.projects.filter((p) => this.selectedPaths.has(p.path));
    }

    isSelected(projectPath: string): boolean {
        return this.selectedPaths.has(projectPath);
    }

    toggleSelection(projectPath: string): void {
        if (this.selectedPaths.has(projectPath)) {
            this.selectedPaths.delete(projectPath);
        } else {
            this.selectedPaths.add(projectPath);
        }
    }

    selectAll(): void {
        this.projects.forEach((p) => this.selectedPaths.add(p.path));
    }

    clearSelection(): void {
        this.selectedPaths.clear();
    }

    renameProject(oldPath: string, newName: string): boolean {
        const project = this.projects.find(p => p.path === oldPath);
        if (!project) {
            return false;
        }

        // 检查新名称是否已存在
        if (this.projects.some(p => p.name === newName && p.path !== oldPath)) {
            vscode.window.showWarningMessage(`项目名称 "${newName}" 已存在`);
            return false;
        }

        // 更新项目名称
        project.name = newName;

        // 保存到 Project Manager 配置
        this.saveToProjectManager();

        return true;
    }

    deleteProject(projectPath: string): boolean {
        const index = this.projects.findIndex(p => p.path === projectPath);
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

    private saveToProjectManager(): void {
        const configPath = this.getProjectManagerConfigPath();
        if (!configPath) {
            vscode.window.showErrorMessage('无法找到 Project Manager 配置文件');
            return;
        }

        try {
            // 转换为 Project Manager 格式
            const config = this.projects.map(project => ({
                name: project.name,
                rootPath: project.path,
                enabled: true
            }));

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        } catch (error) {
            vscode.window.showErrorMessage(`保存 Project Manager 配置失败: ${error}`);
        }
    }

    getConfigPath(): string | null {
        return this.getProjectManagerConfigPath();
    }
}
