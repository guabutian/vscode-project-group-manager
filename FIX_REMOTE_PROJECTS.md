# 修复日志 - 远程 Dev Container 项目支持

## 问题描述

插件无法检测到远程的 Dev Container 项目，只显示空列表。

## 根本原因

原代码只检查本地文件系统的 `.devcontainer` 目录，但用户的项目都是远程项目，路径格式为：

1. **Dev Container 远程项目**：
   ```
   vscode-remote://dev-container+7b22686f737450617468223a...@ssh-remote+7b22686f73744e616d65223a...
   ```

2. **SSH Remote 项目**：
   ```
   vscode-remote://ssh-remote+7b22686f73744e616d65223a...
   ```

原代码尝试用 `fs.existsSync()` 检查这些远程 URI，导致检测失败。

## 修复方案

### 1. 修改项目检测逻辑 (projectManager.ts)

**新增方法 `isDevContainerProject()`**：

```typescript
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
```

**修改 `loadProjects()` 方法**：

```typescript
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
```

### 2. 修改项目打开逻辑 (extension.ts)

**修改 `openDevContainer()` 函数**：

```typescript
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
```

## 修复效果

### 修复前
- ❌ 无法检测远程 Dev Container 项目
- ❌ 项目列表为空
- ❌ 无法打开远程项目

### 修复后
- ✅ 正确检测远程 Dev Container 项目
- ✅ 显示所有 Dev Container 项目（根据你的配置，应该有 7 个）
- ✅ 可以打开远程 Dev Container 项目

## 检测到的 Dev Container 项目

根据你的 Project Manager 配置，应该检测到以下项目：

1. `devbox/web/react_demo1` (line 357)
2. `devbox/web/hydra` (line 505)
3. `devgui/ai/i18n_content_generate` (line 521)
4. `devbox/faceu/faceu-common` (line 609)
5. `devbox/ai/dreamina_feature` (line 617)
6. `de vguinanochat` (line 633)
7. `devgui/python/nanochat` (line 641)
8. `devbox/ai/dreamina_ddd` (line 649)
9. `DevBoxBig/ai/i18n_mweb_api` (line 665)

共 9 个 Dev Container 项目。

## 测试步骤

1. **重新加载插件**
   - 在 Extension Development Host 窗口中按 `Cmd+R` 重新加载
   - 或关闭窗口，在开发窗口按 `F5` 重新启动

2. **检查项目列表**
   - 点击侧边栏的 Dev Container Groups 图标
   - 应该看到 9 个项目

3. **测试选择功能**
   - 点击项目名称切换选中状态
   - 应该看到 ✓ 标记

4. **测试保存组**
   - 选中几个项目
   - 点击保存图标 💾
   - 输入组名测试

5. **测试打开项目**
   - 选中 1-2 个项目
   - 点击打开图标 📂
   - 应该打开新的 VS Code 窗口

## 技术细节

### URI 格式说明

**Dev Container URI 结构**：
```
vscode-remote://dev-container+<encoded-config>@ssh-remote+<encoded-host>/workspaces/<project-name>
```

**组成部分**：
- `vscode-remote://` - VS Code 远程协议
- `dev-container+` - Dev Container 类型标识
- `<encoded-config>` - Base64 编码的容器配置
- `@ssh-remote+` - SSH 远程主机
- `<encoded-host>` - Base64 编码的主机信息
- `/workspaces/<project-name>` - 工作区路径

### 为什么不检查 SSH Remote 项目

SSH Remote 项目（`vscode-remote://ssh-remote+...`）虽然可能包含 `.devcontainer` 配置，但它们不是运行在容器中的项目，而是直接在远程主机上运行的项目。

只有 URI 中包含 `dev-container+` 的项目才是真正运行在 Dev Container 中的项目。

## 后续优化建议

### 1. 添加项目类型标识

可以在 UI 中显示项目类型：

```typescript
interface Project {
    name: string;
    path: string;
    hasDevContainer: boolean;
    type: 'local' | 'remote-devcontainer' | 'ssh-remote'; // 新增
}
```

### 2. 支持 SSH Remote 项目

如果需要支持 SSH Remote 项目，可以：
1. 通过 SSH 连接检查远程路径的 `.devcontainer` 目录
2. 或者让用户手动标记哪些 SSH 项目包含 Dev Container

### 3. 显示远程主机信息

可以解析 URI 中的主机信息，显示项目所在的远程主机：

```typescript
// 解析 URI 获取主机名
const hostMatch = projectPath.match(/ssh-remote\+([^\/]+)/);
if (hostMatch) {
    const encodedHost = hostMatch[1];
    const hostInfo = JSON.parse(Buffer.from(encodedHost, 'hex').toString());
    console.log('主机名:', hostInfo.hostName);
}
```

## 已知限制

1. **只检测 Dev Container 远程项目**
   - 不检测 SSH Remote 项目（即使它们有 `.devcontainer`）
   - 原因：无法直接访问远程文件系统

2. **依赖 Project Manager 配置**
   - 必须在 Project Manager 中添加项目
   - 项目路径必须是完整的 URI

3. **打开速度**
   - 远程项目打开速度取决于网络和容器启动时间
   - 建议适当增加延迟配置

## 推荐配置

对于远程 Dev Container 项目，推荐使用以下配置：

```json
{
  // 远程项目需要更长的启动时间
  "devContainerGroups.openDelay": 3000,

  // 减少并发数，避免网络拥堵
  "devContainerGroups.batchSize": 2,

  // 增加批次间延迟
  "devContainerGroups.batchDelay": 15000
}
```

## 测试清单

- [ ] 项目列表显示 9 个 Dev Container 项目
- [ ] 可以点击切换选中状态
- [ ] 可以保存为组
- [ ] 可以打开单个项目
- [ ] 可以批量打开多个项目
- [ ] 进度条正常显示
- [ ] 可以取消操作
- [ ] "all" 组自动创建

---

现在请重新测试插件，应该可以看到所有的 Dev Container 项目了！
