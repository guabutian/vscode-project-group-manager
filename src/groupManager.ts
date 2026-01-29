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
            this.groups.set(group.name, group);
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
        this.groups.set(name, {
            name,
            projects: projectPaths
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

    updateGroup(name: string, projectPaths: string[]): void {
        const group = this.groups.get(name);
        if (group) {
            group.projects = projectPaths;
            this.saveGroups();
        }
    }
}
