import * as vscode from "vscode";
import * as cp from "child_process";
import * as util from "util";
import { GroupManager } from "./groupManager"; //组管理
import { GroupsTreeProvider } from "./groupsTreeProvider"; // 组管理的icon
import { ProjectManager } from "./projectManager"; // 项目管理
import { ProjectsTreeProvider } from "./projectsTreeProvider"; // 项目管理的icon

const execPromise = util.promisify(cp.exec);

// 插件激活时调用
export function activate(context: vscode.ExtensionContext) {
    console.log("Project Group Manager 已激活");

    const projectManager = new ProjectManager(context);
    const groupManager = new GroupManager(context);

    // 树形视图提供者
    const projectsProvider = new ProjectsTreeProvider(projectManager);
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
                }
            },
        ),
    );

    // 全选
    context.subscriptions.push(
        vscode.commands.registerCommand("devContainerGroups.selectAll", () => {
            projectManager.selectAll();
            projectsProvider.refresh();
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

    // 重载所有窗口
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.reloadAllWindows",
            async () => {
                const answer = await vscode.window.showWarningMessage(
                    "重载所有窗口？这将关闭并重新打开所有远程窗口。",
                    "是",
                    "否",
                );

                if (answer === "是") {
                    await vscode.commands.executeCommand(
                        "workbench.action.reloadWindow",
                    );
                }
            },
        ),
    );

    // 重载组内所有窗口
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.reloadGroup",
            async (item) => {
                if (item && item.group) {
                    const answer = await vscode.window.showWarningMessage(
                        `重载组 "${item.group.name}" 的所有窗口？这将重新加载该组内所有已打开的项目窗口（${item.group.projects.length} 个）。`,
                        "是",
                        "否",
                    );

                    if (answer === "是") {
                        await reloadGroupWindows(item.group.projects);
                    }
                }
            },
        ),
    );

    // 关闭组内所有窗口
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "devContainerGroups.closeGroup",
            async (item) => {
                if (item && item.group) {
                    const answer = await vscode.window.showWarningMessage(
                        `关闭组 "${item.group.name}" 的所有窗口？这将关闭该组内所有已打开的项目窗口（${item.group.projects.length} 个）。`,
                        "是",
                        "否",
                    );

                    if (answer === "是") {
                        await closeGroupWindows(item.group.projects);
                    }
                }
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

    // 关闭组内所有窗口的函数
    async function closeGroupWindows(projectPaths: string[]) {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "正在关闭组内窗口",
                cancellable: false,
            },
            async (progress) => {
                let closed = 0;
                const total = projectPaths.length;

                try {
                    // 获取所有打开的窗口
                    const openWindows = await getOpenWindows();

                    // 匹配组内的项目路径
                    const windowsToClose = openWindows.filter(window =>
                        projectPaths.some(projectPath =>
                            window.includes(projectPath) ||
                            normalizeUri(window) === normalizeUri(projectPath)
                        )
                    );

                    if (windowsToClose.length === 0) {
                        vscode.window.showInformationMessage(
                            `组内没有已打开的窗口`
                        );
                        return;
                    }

                    progress.report({
                        message: `找到 ${windowsToClose.length} 个已打开的窗口`,
                    });

                    // 逐个关闭窗口
                    for (let i = 0; i < windowsToClose.length; i++) {
                        const window = windowsToClose[i];
                        progress.report({
                            message: `正在关闭 ${i + 1}/${windowsToClose.length}`,
                            increment: 100 / windowsToClose.length,
                        });

                        try {
                            await closeWindow(window);
                            closed++;
                            await sleep(500); // 延迟避免过快
                        } catch (error) {
                            console.error(`关闭窗口失败: ${window}`, error);
                        }
                    }

                    vscode.window.showInformationMessage(
                        `已关闭 ${closed}/${windowsToClose.length} 个窗口`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `关闭窗口失败: ${error}`
                    );
                }
            }
        );
    }

    // 重载组内所有窗口的函数
    async function reloadGroupWindows(projectPaths: string[]) {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "正在重载组内窗口",
                cancellable: false,
            },
            async (progress) => {
                let reloaded = 0;

                try {
                    // 获取所有打开的窗口
                    const openWindows = await getOpenWindows();

                    // 匹配组内的项目路径
                    const windowsToReload = openWindows.filter(window =>
                        projectPaths.some(projectPath =>
                            window.includes(projectPath) ||
                            normalizeUri(window) === normalizeUri(projectPath)
                        )
                    );

                    if (windowsToReload.length === 0) {
                        vscode.window.showInformationMessage(
                            `组内没有已打开的窗口`
                        );
                        return;
                    }

                    progress.report({
                        message: `找到 ${windowsToReload.length} 个已打开的窗口`,
                    });

                    // 逐个重载窗口
                    for (let i = 0; i < windowsToReload.length; i++) {
                        const window = windowsToReload[i];
                        progress.report({
                            message: `正在重载 ${i + 1}/${windowsToReload.length}`,
                            increment: 100 / windowsToReload.length,
                        });

                        try {
                            await reloadWindow(window);
                            reloaded++;
                            await sleep(500); // 延迟避免过快
                        } catch (error) {
                            console.error(`重载窗口失败: ${window}`, error);
                        }
                    }

                    vscode.window.showInformationMessage(
                        `已重载 ${reloaded}/${windowsToReload.length} 个窗口`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `重载窗口失败: ${error}`
                    );
                }
            }
        );
    }

    // 获取所有打开的 VS Code 窗口
    async function getOpenWindows(): Promise<string[]> {
        const platform = process.platform;

        try {
            if (platform === 'darwin') {
                // macOS: 使用 AppleScript
                const script = `
                    tell application "System Events"
                        set vscodeWindows to {}
                        repeat with proc in (every process whose name contains "Code")
                            repeat with win in (every window of proc)
                                set end of vscodeWindows to name of win
                            end repeat
                        end repeat
                        return vscodeWindows
                    end tell
                `;
                const { stdout } = await execPromise(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
                return stdout.trim().split(', ').filter(w => w.length > 0);
            } else if (platform === 'win32') {
                // Windows: 使用 PowerShell
                const script = `
                    Get-Process | Where-Object {$_.ProcessName -like "*Code*"} |
                    ForEach-Object {$_.MainWindowTitle} |
                    Where-Object {$_ -ne ""}
                `;
                const { stdout } = await execPromise(`powershell -Command "${script}"`);
                return stdout.trim().split('\n').filter(w => w.length > 0);
            } else {
                // Linux: 使用 wmctrl 或 xdotool
                try {
                    const { stdout } = await execPromise(`wmctrl -l | grep -i code | awk '{$1=$2=$3=""; print $0}' | sed 's/^[ \\t]*//'`);
                    return stdout.trim().split('\n').filter(w => w.length > 0);
                } catch {
                    // 如果 wmctrl 不可用，尝试 xdotool
                    const { stdout } = await execPromise(`xdotool search --class code getwindowname %@`);
                    return stdout.trim().split('\n').filter(w => w.length > 0);
                }
            }
        } catch (error) {
            console.error('获取窗口列表失败:', error);
            return [];
        }
    }

    // 关闭指定的窗口
    async function closeWindow(windowTitle: string): Promise<void> {
        const platform = process.platform;

        if (platform === 'darwin') {
            // macOS: 使用 AppleScript
            const script = `
                tell application "System Events"
                    repeat with proc in (every process whose name contains "Code")
                        repeat with win in (every window of proc)
                            if name of win is "${windowTitle.replace(/"/g, '\\"')}" then
                                click button 1 of win
                                return
                            end if
                        end repeat
                    end repeat
                end tell
            `;
            await execPromise(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
        } else if (platform === 'win32') {
            // Windows: 使用 PowerShell
            const script = `
                Get-Process | Where-Object {$_.MainWindowTitle -eq "${windowTitle.replace(/"/g, '`"')}"} |
                ForEach-Object {$_.CloseMainWindow()}
            `;
            await execPromise(`powershell -Command "${script}"`);
        } else {
            // Linux: 使用 wmctrl
            await execPromise(`wmctrl -c "${windowTitle.replace(/"/g, '\\"')}"`);
        }
    }

    // 重载指定的窗口
    async function reloadWindow(windowTitle: string): Promise<void> {
        const platform = process.platform;

        if (platform === 'darwin') {
            // macOS: 使用 AppleScript 发送 Cmd+R
            const script = `
                tell application "System Events"
                    repeat with proc in (every process whose name contains "Code")
                        repeat with win in (every window of proc)
                            if name of win is "${windowTitle.replace(/"/g, '\\"')}" then
                                set frontmost of proc to true
                                tell proc
                                    keystroke "r" using command down
                                end tell
                                return
                            end if
                        end repeat
                    end repeat
                end tell
            `;
            await execPromise(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
        } else if (platform === 'win32') {
            // Windows: 使用 PowerShell 发送 Ctrl+R
            const script = `
                Add-Type -AssemblyName System.Windows.Forms
                $proc = Get-Process | Where-Object {$_.MainWindowTitle -eq "${windowTitle.replace(/"/g, '`"')}"} | Select-Object -First 1
                if ($proc) {
                    $null = [System.Windows.Forms.SendKeys]::SendWait("^r")
                }
            `;
            await execPromise(`powershell -Command "${script}"`);
        } else {
            // Linux: 使用 xdotool 发送 Ctrl+R
            const windowId = await execPromise(`xdotool search --name "${windowTitle.replace(/"/g, '\\"')}" | head -1`);
            if (windowId.stdout.trim()) {
                await execPromise(`xdotool key --window ${windowId.stdout.trim()} ctrl+r`);
            }
        }
    }

    // 标准化 URI 用于比较
    function normalizeUri(uri: string): string {
        // 移除 vscode-remote:// 前缀
        if (uri.startsWith('vscode-remote://')) {
            return uri.substring('vscode-remote://'.length);
        }
        return uri;
    }
}

// 插件停用时调用
export function deactivate() {}
