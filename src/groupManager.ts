import * as vscode from 'vscode';

export interface ProjectGroup {
    name: string;
    projects: string[];
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
                projects: uniquePaths
            });
        }
    }

    private saveGroups(): void {
        const groupsArray = Array.from(this.groups.values());
        this.context.globalState.update('projectGroups', groupsArray);
    }

    getAllGroups(): ProjectGroup[] {
        return Array.from(this.groups.values()).sort((a, b) => {
            // "all" 组始终排在最前面
            if (a.name === 'all') return -1;
            if (b.name === 'all') return 1;
            return a.name.localeCompare(b.name);
        });
    }

    getGroup(name: string): ProjectGroup | undefined {
        return this.groups.get(name);
    }

    saveGroup(name: string, projectPaths: string[]): void {
        // 去重：使用 Set 去除重复的项目路径
        const uniquePaths = Array.from(new Set(projectPaths));

        this.groups.set(name, {
            name,
            projects: uniquePaths
        });
        this.saveGroups();
    }

    deleteGroup(name: string): void {
        if (name === 'all') {
            vscode.window.showWarningMessage('不能删除 "all" 组');
            return;
        }
        this.groups.delete(name);
        this.saveGroups();
    }

    renameGroup(oldName: string, newName: string): boolean {
        if (oldName === 'all') {
            vscode.window.showWarningMessage('不能重命名 "all" 组');
            return false;
        }

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
            projects: group.projects
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
}
