import * as vscode from 'vscode';

export interface ProjectGroup {
    name: string;
    projects: string[];
    weight?: number;  // 权重分，默认为0
}

export class GroupManager {
    private context: vscode.ExtensionContext;
    private groups: Map<string, ProjectGroup> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadGroups();
    }

    private loadGroups(): void {
        const saved = this.context.globalState.get<ProjectGroup[]>('projectGroups', []);
        this.groups.clear();

        for (const group of saved) {
            // 加载时也去重，防止历史数据有重复
            const uniquePaths = Array.from(new Set(group.projects));
            this.groups.set(group.name, {
                name: group.name,
                projects: uniquePaths,
                weight: group.weight
            });
        }
    }

    private saveGroups(): void {
        const groupsArray = Array.from(this.groups.values());
        this.context.globalState.update('projectGroups', groupsArray);
    }

    getAllGroups(): ProjectGroup[] {
        return Array.from(this.groups.values()).sort((a, b) => {
            // 首先按权重分降序排序（高分在前）
            const weightA = a.weight ?? 0;
            const weightB = b.weight ?? 0;
            if (weightA !== weightB) {
                return weightB - weightA;  // 降序
            }
            // 权重分相同时，按名称字母顺序排序
            return a.name.localeCompare(b.name);
        });
    }

    getGroup(name: string): ProjectGroup | undefined {
        return this.groups.get(name);
    }

    saveGroup(name: string, projectPaths: string[], weight?: number): void {
        // 去重：使用 Set 去除重复的项目路径
        const uniquePaths = Array.from(new Set(projectPaths));

        this.groups.set(name, {
            name,
            projects: uniquePaths,
            weight: weight
        });
        this.saveGroups();
    }

    deleteGroup(name: string): void {
        this.groups.delete(name);
        this.saveGroups();
    }

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
            weight: group.weight
        });

        this.saveGroups();
        return true;
    }

    updateGroup(name: string, projectPaths: string[]): void {
        const group = this.groups.get(name);
        if (group) {
            // 去重：使用 Set 去除重复的项目路径
            group.projects = Array.from(new Set(projectPaths));
            this.saveGroups();
        }
    }

    setGroupWeight(name: string, weight: number): void {
        const group = this.groups.get(name);
        if (group) {
            group.weight = weight;
            this.saveGroups();
        }
    }

    removeProjectFromGroup(groupName: string, projectPath: string): void {
        const group = this.groups.get(groupName);
        if (group) {
            group.projects = group.projects.filter(path => path !== projectPath);
            this.saveGroups();
        }
    }

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
}
