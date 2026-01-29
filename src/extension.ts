import * as vscode from 'vscode';
import { ProjectsTreeProvider } from './projectsTreeProvider';
import { GroupsTreeProvider } from './groupsTreeProvider';
import { ProjectManager } from './projectManager';
import { GroupManager } from './groupManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Dev Container 项目组管理器已激活');

    const projectManager = new ProjectManager(context);
    const groupManager = new GroupManager(context);

    // 树形视图提供者
    const projectsProvider = new ProjectsTreeProvider(projectManager);
    const groupsProvider = new GroupsTreeProvider(groupManager);

    // 注册树形视图
    vscode.window.registerTreeDataProvider('devContainerProjectsView', projectsProvider);
    vscode.window.registerTreeDataProvider('devContainerGroupsView', groupsProvider);

    // 刷新项目列表
    context.subscriptions.push(
        vscode.commands.registerCommand('devContainerGroups.refresh', async () => {
            await projectManager.loadProjects();
            projectsProvider.refresh();
        })
    );

    // 切换项目选中状态
    context.subscriptions.push(
        vscode.commands.registerCommand('devContainerGroups.toggleProject', (item) => {
            if (item && item.project) {
                projectManager.toggleSelection(item.project.path);
                projectsProvider.refresh();
            }
        })
    );

    // 全选
    context.subscriptions.push(
        vscode.commands.registerCommand('devContainerGroups.selectAll', () => {
            projectManager.selectAll();
            projectsProvider.refresh();
            vscode.window.showInformationMessage(`已选中所有 ${projectManager.getAllProjects().length} 个项目`);
        })
    );

    // 清除选择
    context.subscriptions.push(
        vscode.commands.registerCommand('devContainerGroups.clearSelection', () => {
            projectManager.clearSelection();
            projectsProvider.refresh();
            vscode.window.showInformationMessage('已清除所有选择');
        })
    );

    // 打开选中的项目
    context.subscriptions.push(
        vscode.commands.registerCommand('devContainerGroups.openSelected', async () => {
            const selected = projectManager.getSelectedProjects();
            if (selected.length === 0) {
                vscode.window.showWarningMessage('没有选中的项目');
                return;
            }

            const answer = await vscode.window.showInformationMessage(
                `打开 ${selected.length} 个项目？`,
                '是',
                '否'
            );

            if (answer === '是') {
                await openProjects(selected.map(p => p.path));
            }
        })
    );

    // 保存为组
    context.subscriptions.push(
        vscode.commands.registerCommand('devContainerGroups.saveAsGroup', async () => {
            const selected = projectManager.getSelectedProjects();
            if (selected.length === 0) {
                vscode.window.showWarningMessage('没有选中的项目');
                return;
            }

            const groupName = await vscode.window.showInputBox({
                prompt: '输入组名',
                placeHolder: '例如：microservices-order',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return '组名不能为空';
                    }
                    if (groupManager.getGroup(value)) {
                        return '组名已存在';
                    }
                    return null;
                }
            });

            if (groupName) {
                groupManager.saveGroup(groupName, selected.map(p => p.path));
                groupsProvider.refresh();
                vscode.window.showInformationMessage(`组 "${groupName}" 已保存，包含 ${selected.length} 个项目`);
            }
        })
    );

    // 打开组
    context.subscriptions.push(
        vscode.commands.registerCommand('devContainerGroups.openGroup', async (item) => {
            if (item && item.group) {
                const answer = await vscode.window.showInformationMessage(
                    `打开组 "${item.group.name}"（包含 ${item.group.projects.length} 个项目）？`,
                    '是',
                    '否'
                );

                if (answer === '是') {
                    await openProjects(item.group.projects);
                }
            }
        })
    );

    // 删除组
    context.subscriptions.push(
        vscode.commands.registerCommand('devContainerGroups.deleteGroup', async (item) => {
            if (item && item.group) {
                const answer = await vscode.window.showWarningMessage(
                    `删除组 "${item.group.name}"？`,
                    '是',
                    '否'
                );

                if (answer === '是') {
                    groupManager.deleteGroup(item.group.name);
                    groupsProvider.refresh();
                    vscode.window.showInformationMessage(`组 "${item.group.name}" 已删除`);
                }
            }
        })
    );

    // 重载所有 Dev Container 窗口
    context.subscriptions.push(
        vscode.commands.registerCommand('devContainerGroups.reloadAllWindows', async () => {
            const answer = await vscode.window.showWarningMessage(
                '重载所有 Dev Container 窗口？这将关闭并重新打开所有远程窗口。',
                '是',
                '否'
            );

            if (answer === '是') {
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        })
    );

    // 首次激活时创建默认的 "all" 组
    const allProjects = projectManager.getAllProjects();
    if (allProjects.length > 0 && !groupManager.getGroup('all')) {
        groupManager.saveGroup('all', allProjects.map(p => p.path));
        groupsProvider.refresh();
    }

    // 批量打开项目的核心函数
    async function openProjects(projectPaths: string[]) {
        const config = vscode.workspace.getConfiguration('devContainerGroups');
        const openDelay = config.get<number>('openDelay', 2000);
        const batchSize = config.get<number>('batchSize', 3);
        const batchDelay = config.get<number>('batchDelay', 10000);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '正在打开 Dev Container 项目',
            cancellable: true
        }, async (progress, token) => {
            let opened = 0;
            const total = projectPaths.length;

            for (let i = 0; i < projectPaths.length; i++) {
                if (token.isCancellationRequested) {
                    break;
                }

                const projectPath = projectPaths[i];
                progress.report({
                    message: `正在打开 ${i + 1}/${total}: ${projectPath}`,
                    increment: (100 / total)
                });

                try {
                    await openDevContainer(projectPath);
                    opened++;
                } catch (error) {
                    vscode.window.showErrorMessage(`打开 ${projectPath} 失败: ${error}`);
                }

                // 项目之间的延迟
                if (i < projectPaths.length - 1) {
                    await sleep(openDelay);
                }

                // 批次之间的延迟
                if ((i + 1) % batchSize === 0 && i < projectPaths.length - 1) {
                    progress.report({
                        message: `等待下一批次... (已打开 ${opened}/${total})`
                    });
                    await sleep(batchDelay);
                }
            }

            vscode.window.showInformationMessage(`已打开 ${opened}/${total} 个项目`);
        });
    }

    // 打开单个 Dev Container 项目
    async function openDevContainer(projectPath: string) {
        // 如果是远程 URI，直接使用 URI 打开
        if (projectPath.startsWith('vscode-remote://')) {
            const uri = vscode.Uri.parse(projectPath);
            await vscode.commands.executeCommand(
                'vscode.openFolder',
                uri,
                { forceNewWindow: true }
            );
        } else {
            // 本地项目，使用文件路径
            const uri = vscode.Uri.file(projectPath);

            // 尝试使用 dev container 命令打开
            try {
                await vscode.commands.executeCommand(
                    'vscode.openFolder',
                    uri,
                    { forceNewWindow: true }
                );
            } catch (error) {
                // 如果失败，尝试使用 remote-containers 命令
                await vscode.commands.executeCommand(
                    'remote-containers.openFolder',
                    uri
                );
            }
        }
    }

    // 延迟函数
    function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export function deactivate() {}
