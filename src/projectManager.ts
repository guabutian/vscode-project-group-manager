import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Project {
    name: string;
    path: string;
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

        // 过滤 Dev Container 项目
        for (const project of projectManagerProjects) {
            if (this.isDevContainerProject(project.path)) {
                this.projects.push({
                    ...project,
                    hasDevContainer: true
                });
            }
        }

        // 按名称排序
        this.projects.sort((a, b) => a.name.localeCompare(b.name));
    }

    private async loadFromProjectManager(): Promise<Project[]> {
        const projects: Project[] = [];

        // 查找 Project Manager 配置文件
        const configPath = this.getProjectManagerConfigPath();

        if (!configPath || !fs.existsSync(configPath)) {
            vscode.window.showWarningMessage('未找到 Project Manager 配置。请安装 Project Manager 扩展。');
            return projects;
        }

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);

            // 解析不同格式的项目配置
            if (Array.isArray(config)) {
                // 旧格式：项目数组
                for (const item of config) {
                    if (item.rootPath) {
                        projects.push({
                            name: item.name || path.basename(item.rootPath),
                            path: item.rootPath,
                            hasDevContainer: false
                        });
                    }
                }
            } else if (config.projects) {
                // 新格式：包含 projects 数组的对象
                for (const item of config.projects) {
                    if (item.rootPath) {
                        projects.push({
                            name: item.name || path.basename(item.rootPath),
                            path: item.rootPath,
                            hasDevContainer: false
                        });
                    }
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`加载 Project Manager 配置失败: ${error}`);
        }

        return projects;
    }

    private getProjectManagerConfigPath(): string | null {
        // 检查设置中的自定义路径
        const config = vscode.workspace.getConfiguration('devContainerGroups');
        const customPath = config.get<string>('projectManagerPath');

        if (customPath && fs.existsSync(customPath)) {
            return customPath;
        }

        // 根据平台自动检测
        const homeDir = os.homedir();
        const possiblePaths = [
            // VS Code
            path.join(homeDir, '.config', 'Code', 'User', 'globalStorage', 'alefragnani.project-manager', 'projects.json'),
            // VS Code Insiders
            path.join(homeDir, '.config', 'Code - Insiders', 'User', 'globalStorage', 'alefragnani.project-manager', 'projects.json'),
            // macOS
            path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'alefragnani.project-manager', 'projects.json'),
            // Windows
            path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'alefragnani.project-manager', 'projects.json'),
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

        const devcontainerPath = path.join(projectPath, '.devcontainer');
        if (!fs.existsSync(devcontainerPath)) {
            return false;
        }

        // 检查是否存在 devcontainer.json 或 docker-compose.yml
        const devcontainerJson = path.join(devcontainerPath, 'devcontainer.json');
        const dockerCompose = path.join(devcontainerPath, 'docker-compose.yml');

        return fs.existsSync(devcontainerJson) || fs.existsSync(dockerCompose);
    }

    /**
     * 判断是否为 Dev Container 项目
     * 支持两种类型：
     * 1. 本地项目：检查是否有 .devcontainer 目录
     * 2. 远程项目：检查 URI 是否包含 dev-container
     */
    private isDevContainerProject(projectPath: string): boolean {
        // 检查是否为 Dev Container 远程 URI
        // 格式：vscode-remote://dev-container+...
        if (projectPath.startsWith('vscode-remote://dev-container+')) {
            return true;
        }

        // 对于本地项目，检查 .devcontainer 目录
        if (!projectPath.startsWith('vscode-remote://')) {
            return this.hasDevContainer(projectPath);
        }

        // 其他远程项目（如 SSH Remote）不是 Dev Container
        return false;
    }

    getAllProjects(): Project[] {
        return this.projects;
    }

    getSelectedProjects(): Project[] {
        return this.projects.filter(p => this.selectedPaths.has(p.path));
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
        this.projects.forEach(p => this.selectedPaths.add(p.path));
    }

    clearSelection(): void {
        this.selectedPaths.clear();
    }
}
