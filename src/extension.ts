import * as vscode from "vscode";
import { GroupManager } from "./groupManager"; //组管理
import { GroupsTreeProvider } from "./groupsTreeProvider"; // 组管理的icon
import { ProjectManager } from "./projectManager"; // 项目管理
import { ProjectsTreeProvider } from "./projectsTreeProvider"; // 项目管理的icon

// 插件激活时调用
export function activate(context: vscode.ExtensionContext) {
    console.log("Project Group Manager 已激活");

    const projectManager = new ProjectManager(context);
    const groupManager = new GroupManager(context);

    // 树形视图提供者
    const projectsProvider = new ProjectsTreeProvider(projectManager, context);
    const groupsProvider = new GroupsTreeProvider(groupManager, projectManager);

    // 注册树形视图
    vscode.window.registerTreeDataProvider(
        "projectGroupsProjectsView",
        projectsProvider,
    );
    vscode.window.registerTreeDataProvider(
        "projectGroupsGroupsView",
        groupsProvider,
    );

    // 刷新项目列表
    context.subscriptions.push(
        // 注册命令
        vscode.commands.registerCommand(
            "devContainerGroups.refresh",
            async () => {
                await projectManager.loadProjects();
                projectsProvider.refresh();
            },
        ),
    );

    // 切换项目选中状态
    context.subscriptions.push(
        // 注册命令
        vscode.commands.registerCommand(
            "devContainerGroups.toggleProject",
            (item) => {
                if (item && item.project) {
                    projectManager.toggleSelection(item.project.path);
                    projectsProvider.refresh();
                    groupsProvider.refresh(); // 同时刷新组合列表
                }
            },
        ),
    );

    // 全选
    context.subscriptions.push(
        vscode.commands.registerCommand("devContainerGroups.selectAll", () => {
            projectManager.selectAll();
            projectsProvider.refresh();
            groupsProvider.refresh(); // 同时刷新组合列表
            vscode.window.showInformationMessage(
                `已选中所有 ${projectManager.getAllProjects().length} 个项目`,
            );
        }),
    );

    // 清除选择
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.clearSelection",
            () => {
                projectManager.clearSelection();
                projectsProvider.refresh();
                groupsProvider.refresh(); // 同时刷新组合列表
                vscode.window.showInformationMessage("已清除所有选择");
            },
        ),
    );

    // 打开选中的项目
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.openSelected",
            async () => {
                const selected = projectManager.getSelectedProjects();
                if (selected.length === 0) {
                    vscode.window.showWarningMessage("没有选中的项目");
                    return;
                }

                const answer = await vscode.window.showInformationMessage(
                    `打开 ${selected.length} 个项目？`,
                    "是",
                    "否",
                );

                if (answer === "是") {
                    await openProjects(selected.map((p) => p.path));
                }
            },
        ),
    );

    // 保存为组
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.saveAsGroup",
            async () => {
                const selected = projectManager.getSelectedProjects();
                if (selected.length === 0) {
                    vscode.window.showWarningMessage("没有选中的项目");
                    return;
                }

                const groupName = await vscode.window.showInputBox({
                    prompt: "输入组名",
                    placeHolder: "例如：microservices-order",
                    validateInput: (value) => {
                        if (!value || value.trim().length === 0) {
                            return "组名不能为空";
                        }
                        if (groupManager.getGroup(value)) {
                            return "组名已存在";
                        }
                        return null;
                    },
                });

                if (groupName) {
                    groupManager.saveGroup(
                        groupName,
                        selected.map((p) => p.path),
                    );
                    groupsProvider.refresh();
                    vscode.window.showInformationMessage(
                        `组 "${groupName}" 已保存，包含 ${selected.length} 个项目`,
                    );
                }
            },
        ),
    );

    // 打开组
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.openGroup",
            async (item) => {
                if (item && item.group) {
                    const answer = await vscode.window.showInformationMessage(
                        `打开组 "${item.group.name}"（包含 ${item.group.projects.length} 个项目）？`,
                        "是",
                        "否",
                    );

                    if (answer === "是") {
                        await openProjects(item.group.projects);
                    }
                }
            },
        ),
    );

    // 删除组
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.deleteGroup",
            async (item) => {
                if (item && item.group) {
                    const answer = await vscode.window.showWarningMessage(
                        `删除组 "${item.group.name}"？`,
                        "是",
                        "否",
                    );

                    if (answer === "是") {
                        groupManager.deleteGroup(item.group.name);
                        groupsProvider.refresh();
                        vscode.window.showInformationMessage(
                            `组 "${item.group.name}" 已删除`,
                        );
                    }
                }
            },
        ),
    );

    // 重命名组
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.renameGroup",
            async (item) => {
                if (item && item.group) {
                    const newName = await vscode.window.showInputBox({
                        prompt: "输入新的组名",
                        value: item.group.name,
                        placeHolder: "例如：microservices-order",
                        validateInput: (value) => {
                            if (!value || value.trim().length === 0) {
                                return "组名不能为空";
                            }
                            if (value === item.group.name) {
                                return "新组名与原组名相同";
                            }
                            if (groupManager.getGroup(value)) {
                                return "组名已存在";
                            }
                            return null;
                        },
                    });

                    if (newName) {
                        const success = groupManager.renameGroup(item.group.name, newName);
                        if (success) {
                            groupsProvider.refresh();
                            vscode.window.showInformationMessage(
                                `组 "${item.group.name}" 已重命名为 "${newName}"`,
                            );
                        }
                    }
                }
            },
        ),
    );

    // 复制组
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.duplicateGroup",
            async (item) => {
                if (item && item.group) {
                    // 生成默认的复制名称
                    let defaultName = `${item.group.name}-copy`;
                    let counter = 1;

                    // 如果默认名称已存在，添加数字后缀
                    while (groupManager.getGroup(defaultName)) {
                        counter++;
                        defaultName = `${item.group.name}-copy${counter}`;
                    }

                    const newName = await vscode.window.showInputBox({
                        prompt: "输入新组的名称",
                        value: defaultName,
                        placeHolder: "例如：microservices-order-copy",
                        validateInput: (value) => {
                            if (!value || value.trim().length === 0) {
                                return "组名不能为空";
                            }
                            if (groupManager.getGroup(value)) {
                                return "组名已存在";
                            }
                            return null;
                        },
                    });

                    if (newName) {
                        // 复制项目列表
                        groupManager.saveGroup(newName, [...item.group.projects]);
                        groupsProvider.refresh();
                        vscode.window.showInformationMessage(
                            `已复制组 "${item.group.name}" 为 "${newName}"（包含 ${item.group.projects.length} 个项目）`,
                        );
                    }
                }
            },
        ),
    );

    // 切换显示模式
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.setViewModeFlat",
            () => {
                projectsProvider.setViewMode('flat');
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.setViewModeByType",
            () => {
                projectsProvider.setViewMode('by-type');
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.setViewModeByHost",
            () => {
                projectsProvider.setViewMode('by-host');
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.setViewModeByPath",
            () => {
                projectsProvider.setViewMode('by-path');
            },
        ),
    );

    // 重命名项目
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.renameProject",
            async (item) => {
                if (item && item.project) {
                    const newName = await vscode.window.showInputBox({
                        prompt: "输入新的项目名称",
                        value: item.project.name,
                        placeHolder: "例如：my-project",
                        validateInput: (value) => {
                            if (!value || value.trim().length === 0) {
                                return "项目名称不能为空";
                            }
                            if (value === item.project.name) {
                                return "新名称与原名称相同";
                            }
                            return null;
                        },
                    });

                    if (newName) {
                        const success = projectManager.renameProject(item.project.path, newName);
                        if (success) {
                            projectsProvider.refresh();
                            vscode.window.showInformationMessage(
                                `项目 "${item.project.name}" 已重命名为 "${newName}"`,
                            );
                        }
                    }
                }
            },
        ),
    );

    // 删除项目
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.deleteProject",
            async (item) => {
                if (item && item.project) {
                    const answer = await vscode.window.showWarningMessage(
                        `确定要从 Project Manager 中删除项目 "${item.project.name}"？`,
                        { modal: true, detail: "这将从 Project Manager 配置中移除该项目，但不会删除项目文件。" },
                        "删除",
                        "取消",
                    );

                    if (answer === "删除") {
                        const success = projectManager.deleteProject(item.project.path);
                        if (success) {
                            projectsProvider.refresh();
                            vscode.window.showInformationMessage(
                                `项目 "${item.project.name}" 已删除`,
                            );
                        }
                    }
                }
            },
        ),
    );

    // 打开 Project Manager 配置文件
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.openProjectManagerConfig",
            async () => {
                const configPath = projectManager.getConfigPath();
                if (configPath) {
                    const uri = vscode.Uri.file(configPath);
                    await vscode.window.showTextDocument(uri);
                } else {
                    vscode.window.showErrorMessage('未找到 Project Manager 配置文件');
                }
            },
        ),
    );

    // 打开组配置文件（实际是打开 VS Code 的 globalState，这里用 JSON 编辑器显示）
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.openGroupsConfig",
            async () => {
                // 获取所有组的数据
                const groups = groupManager.getAllGroups();

                // 创建临时 JSON 文件显示配置
                const tempContent = JSON.stringify(groups, null, 2);

                const doc = await vscode.workspace.openTextDocument({
                    content: tempContent,
                    language: 'json'
                });

                await vscode.window.showTextDocument(doc, {
                    preview: false
                });

                vscode.window.showInformationMessage(
                    '组配置存储在 VS Code globalState 中，这是只读预览。请使用界面操作来修改组配置。'
                );
            },
        ),
    );

    // 首次激活时创建默认的 "all" 组
    const allProjects = projectManager.getAllProjects();
    if (allProjects.length > 0 && !groupManager.getGroup("all")) {
        groupManager.saveGroup(
            "all",
            allProjects.map((p) => p.path),
        );
        groupsProvider.refresh();
    }

    // 批量打开项目的核心函数
    async function openProjects(projectPaths: string[]) {
        const config = vscode.workspace.getConfiguration("projectGroups");
        const openDelay = config.get<number>("openDelay", 2000);
        const batchSize = config.get<number>("batchSize", 3);
        const batchDelay = config.get<number>("batchDelay", 10000);

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "正在打开项目",
                cancellable: true,
            },
            async (progress, token) => {
                let opened = 0;
                const total = projectPaths.length;

                for (let i = 0; i < projectPaths.length; i++) {
                    if (token.isCancellationRequested) {
                        break;
                    }

                    const projectPath = projectPaths[i];
                    progress.report({
                        message: `正在打开 ${i + 1}/${total}: ${projectPath}`,
                        increment: 100 / total,
                    });

                    try {
                        await openDevContainer(projectPath);
                        opened++;
                    } catch (error) {
                        vscode.window.showErrorMessage(
                            `打开 ${projectPath} 失败: ${error}`,
                        );
                    }

                    // 项目之间的延迟
                    if (i < projectPaths.length - 1) {
                        await sleep(openDelay);
                    }

                    // 批次之间的延迟
                    if (
                        (i + 1) % batchSize === 0 &&
                        i < projectPaths.length - 1
                    ) {
                        progress.report({
                            message: `等待下一批次... (已打开 ${opened}/${total})`,
                        });
                        await sleep(batchDelay);
                    }
                }

                vscode.window.showInformationMessage(
                    `已打开 ${opened}/${total} 个项目`,
                );
            },
        );
    }

    // 打开单个项目
    async function openDevContainer(projectPath: string) {
        // 如果是远程 URI，直接使用 URI 打开
        if (projectPath.startsWith("vscode-remote://")) {
            const uri = vscode.Uri.parse(projectPath);
            await vscode.commands.executeCommand("vscode.openFolder", uri, {
                forceNewWindow: true,
            });
        } else {
            // 本地项目，使用文件路径
            const uri = vscode.Uri.file(projectPath);

            // 尝试使用标准命令打开
            try {
                await vscode.commands.executeCommand("vscode.openFolder", uri, {
                    forceNewWindow: true,
                });
            } catch (error) {
                // 如果失败，尝试使用 remote-containers 命令
                await vscode.commands.executeCommand(
                    "remote-containers.openFolder",
                    uri,
                );
            }
        }
    }

    // 延迟函数
    function sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// 插件停用时调用
export function deactivate() {}
