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
    const projectsTreeView = vscode.window.createTreeView(
        "projectGroupsProjectsView",
        {
            treeDataProvider: projectsProvider,
            showCollapseAll: true
        }
    );
    const groupsTreeView = vscode.window.createTreeView(
        "projectGroupsGroupsView",
        {
            treeDataProvider: groupsProvider,
            showCollapseAll: true
        }
    );

    // 刷新项目列表
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.refresh",
            async () => {
                // 先清理重复项目
                const duplicateCount = projectManager.cleanDuplicates();

                await projectManager.loadProjects();
                projectsProvider.refresh();

                // 显示刷新完成提示
                const projectCount = projectManager.getAllProjects().length;
                if (duplicateCount > 0) {
                    vscode.window.showInformationMessage(
                        `已重新加载 ${projectCount} 个项目（清理了 ${duplicateCount} 个重复项）`
                    );
                } else {
                    vscode.window.showInformationMessage(
                        `已重新加载 ${projectCount} 个项目`
                    );
                }
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

    // 在项目列表中定位到项目
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.locateProjectInList",
            async (item) => {
                if (item && item.project) {
                    // 先切换选中状态
                    projectManager.toggleSelection(item.project.path);
                    projectsProvider.refresh();
                    groupsProvider.refresh();

                    try {
                        // 查找项目的树项
                        const treeItem = await projectsProvider.findProjectTreeItem(item.project.path);

                        if (treeItem) {
                            // 使用 reveal 定位到项目
                            await projectsTreeView.reveal(treeItem, {
                                select: true,
                                focus: true,
                                expand: true
                            });
                        }
                    } catch (error) {
                        console.log('无法定位到项目:', error);
                    }
                }
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

    // 清除所有选中
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.clearSelection",
            () => {
                projectManager.clearSelection();
                projectsProvider.refresh();
                groupsProvider.refresh();
                vscode.window.showInformationMessage("已清除所有选中");
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

    // 在项目列表中选中组内的项目
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.selectGroupInProjects",
            async (item) => {
                if (item && item.group) {
                    // 清除当前选中
                    projectManager.clearSelection();

                    // 选中组内的所有项目
                    for (const projectPath of item.group.projects) {
                        projectManager.toggleSelection(projectPath);
                    }

                    // 刷新两个视图
                    projectsProvider.refresh();
                    groupsProvider.refresh();

                    // 在项目列表中定位到第一个项目
                    if (item.group.projects.length > 0) {
                        const firstProjectPath = item.group.projects[0];
                        const allProjects = projectManager.getAllProjects();
                        const firstProject = allProjects.find(p => p.path === firstProjectPath);

                        if (firstProject) {
                            // 根据当前视图模式找到对应的树项
                            const viewMode = projectsProvider.getViewMode();

                            // 等待视图刷新完成
                            await new Promise(resolve => setTimeout(resolve, 100));

                            // 尝试展开并定位到项目
                            try {
                                if (viewMode === 'flat') {
                                    // 平铺模式：直接定位到项目
                                    const projectItem = new (await import('./projectsTreeProvider')).ProjectTreeItem(
                                        firstProject,
                                        projectManager.isSelected(firstProject.path)
                                    );
                                    await projectsTreeView.reveal(projectItem, { select: true, focus: true });
                                } else if (viewMode === 'by-type') {
                                    // 按类型分组：先展开类型组，再定位到项目
                                    // 这里需要更复杂的逻辑来找到父节点
                                } else if (viewMode === 'by-path') {
                                    // 按路径分组：需要展开路径层级
                                }
                            } catch (error) {
                                console.log('无法定位到项目:', error);
                            }
                        }
                    }

                    vscode.window.showInformationMessage(
                        `已在项目列表中选中组 "${item.group.name}" 的 ${item.group.projects.length} 个项目`
                    );
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
                        // 复制项目列表和权重分
                        groupManager.saveGroup(newName, [...item.group.projects], item.group.weight);
                        groupsProvider.refresh();
                        vscode.window.showInformationMessage(
                            `已复制组 "${item.group.name}" 为 "${newName}"（包含 ${item.group.projects.length} 个项目）`,
                        );
                    }
                }
            },
        ),
    );

    // 设置组权重分
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.setGroupWeight",
            async (item) => {
                if (item && item.group) {
                    const currentWeight = item.group.weight ?? 0;
                    const input = await vscode.window.showInputBox({
                        prompt: "设置权重分（数字越大排序越靠前）",
                        value: currentWeight.toString(),
                        placeHolder: "输入数字，例如：100",
                        validateInput: (value) => {
                            const num = parseInt(value);
                            if (isNaN(num)) {
                                return "请输入有效的数字";
                            }
                            if (num < 0) {
                                return "权重分不能为负数";
                            }
                            return null;
                        }
                    });

                    if (input !== undefined) {
                        const weight = parseInt(input);
                        groupManager.setGroupWeight(item.group.name, weight);
                        groupsProvider.refresh();
                        vscode.window.showInformationMessage(
                            `组 "${item.group.name}" 的权重分已设置为 ${weight}`
                        );
                    }
                }
            }
        )
    );

    // 从组合中移除项目
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.removeProjectFromGroup",
            async (item) => {
                if (item && item.project && item.groupName) {
                    const answer = await vscode.window.showWarningMessage(
                        `从组合 "${item.groupName}" 中移除项目 "${item.project.name}"？`,
                        "是",
                        "否"
                    );

                    if (answer === "是") {
                        groupManager.removeProjectFromGroup(item.groupName, item.project.path);
                        groupsProvider.refresh();
                        vscode.window.showInformationMessage(
                            `已从组合 "${item.groupName}" 中移除项目 "${item.project.name}"`
                        );
                    }
                }
            }
        )
    );

    // 添加项目到组合
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.addProjectToGroup",
            async (item) => {
                if (item && item.project) {
                    // 获取所有组合
                    const allGroups = groupManager.getAllGroups();

                    if (allGroups.length === 0) {
                        vscode.window.showWarningMessage("没有可用的组合，请先创建组合");
                        return;
                    }

                    // 创建快速选择项
                    const quickPickItems = allGroups.map(group => ({
                        label: group.name,
                        description: `${group.projects.length} 个项目`,
                        detail: group.projects.includes(item.project.path) ? "✓ 已包含此项目" : undefined,
                        group: group
                    }));

                    // 显示快速选择
                    const selected = await vscode.window.showQuickPick(quickPickItems, {
                        placeHolder: `选择要添加到的组合（当前项目：${item.project.name}）`,
                        matchOnDescription: true,
                        matchOnDetail: true
                    });

                    if (selected) {
                        // 检查项目是否已经在组合中
                        if (selected.group.projects.includes(item.project.path)) {
                            vscode.window.showInformationMessage(
                                `项目 "${item.project.name}" 已经在组合 "${selected.group.name}" 中`
                            );
                        } else {
                            // 添加项目到组合
                            groupManager.addProjectToGroup(selected.group.name, item.project.path);
                            groupsProvider.refresh();
                            vscode.window.showInformationMessage(
                                `已将项目 "${item.project.name}" 添加到组合 "${selected.group.name}"`
                            );
                        }
                    }
                }
            }
        )
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
                            groupsProvider.refresh(); // 同时刷新组合列表
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
                            groupsProvider.refresh(); // 同时刷新组合列表
                            vscode.window.showInformationMessage(
                                `项目 "${item.project.name}" 已删除`,
                            );
                        }
                    }
                }
            },
        ),
    );

    // 重命名路径节点
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.renamePathGroup",
            async (item) => {
                if (item && item.pathNode && item.label) {
                    // 获取完整的路径前缀
                    const oldPathPrefix = item.pathNode.fullPath;

                    const newPathPrefix = await vscode.window.showInputBox({
                        prompt: "输入新的路径名称",
                        value: oldPathPrefix,
                        placeHolder: "例如：devbox/ai",
                        validateInput: (value) => {
                            if (!value || value.trim().length === 0) {
                                return "路径名称不能为空";
                            }
                            if (value === oldPathPrefix) {
                                return "新路径名称与原路径名称相同";
                            }
                            if (value.includes('//')) {
                                return "路径不能包含连续的斜杠";
                            }
                            return null;
                        },
                    });

                    if (newPathPrefix) {
                        // 收集该路径节点下的所有项目
                        const affectedProjects = item.projects;

                        if (affectedProjects.length === 0) {
                            vscode.window.showWarningMessage("该路径下没有项目");
                            return;
                        }

                        // 确认操作
                        const answer = await vscode.window.showInformationMessage(
                            `将重命名 ${affectedProjects.length} 个项目的路径前缀\n从 "${oldPathPrefix}" 改为 "${newPathPrefix}"`,
                            { modal: true },
                            "确定",
                            "取消"
                        );

                        if (answer !== "确定") {
                            return;
                        }

                        // 批量重命名项目
                        let successCount = 0;
                        let skippedCount = 0;

                        for (const project of affectedProjects) {
                            // 计算新的项目名称
                            const oldName = project.name;
                            let newName: string;

                            // 使用不区分大小写的匹配
                            const oldNameLower = oldName.toLowerCase();
                            const oldPathPrefixLower = oldPathPrefix.toLowerCase();

                            if (oldNameLower.startsWith(oldPathPrefixLower + '/')) {
                                // 替换路径前缀（保留原始大小写的后续部分）
                                newName = newPathPrefix + oldName.substring(oldPathPrefix.length);
                            } else if (oldNameLower === oldPathPrefixLower) {
                                // 如果项目名就是路径名
                                newName = newPathPrefix;
                            } else {
                                // 跳过不匹配的项目
                                skippedCount++;
                                continue;
                            }

                            // 重命名项目
                            const success = projectManager.renameProject(project.path, newName);
                            if (success) {
                                successCount++;
                            }
                        }

                        // 刷新视图
                        projectsProvider.refresh();
                        groupsProvider.refresh();

                        // 显示结果
                        vscode.window.showInformationMessage(
                            `成功重命名 ${successCount}/${affectedProjects.length} 个项目${skippedCount > 0 ? `（跳过 ${skippedCount} 个）` : ''}`
                        );
                    }
                }
            },
        ),
    );

    // 打开单个项目
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.openProject",
            async (item) => {
                if (item && item.project) {
                    try {
                        await openDevContainer(item.project.path);
                        vscode.window.showInformationMessage(
                            `正在打开项目 "${item.project.name}"`,
                        );
                    } catch (error) {
                        vscode.window.showErrorMessage(
                            `打开项目 "${item.project.name}" 失败: ${error}`,
                        );
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
