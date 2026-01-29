# 快速开始指南

## 项目已创建完成！

你的 VS Code 插件项目已经在以下位置创建：
```
/Users/bytedance/Documents/code/vscode-plugin/dev-container-group-manager
```

## 立即开始使用

### 1. 打开项目
```bash
cd /Users/bytedance/Documents/code/vscode-plugin/dev-container-group-manager
code .
```

### 2. 启动调试
在 VS Code 中：
1. 按 `F5` 键（或点击 Run > Start Debugging）
2. 会打开一个新的 VS Code 窗口（Extension Development Host）
3. 在新窗口的活动栏中找到 Dev Container Groups 图标（服务器图标）

### 3. 使用插件

#### 查看项目
- 点击侧边栏的 Dev Container Groups 图标
- 你会看到两个视图：
  - **Projects**：所有 Dev Container 项目
  - **Saved Groups**：保存的项目组

#### 选择项目
- 点击项目名称来勾选/取消勾选
- 勾选的项目会显示 ✓ 和绿色图标

#### 保存为组
1. 勾选多个项目
2. 点击工具栏的保存图标（💾）
3. 输入组名（如 "order-service-group"）
4. 组会出现在 Saved Groups 中

#### 打开项目
- **打开选中的项目**：点击文件夹图标（📂）
- **打开保存的组**：点击组名

#### 重载所有窗口
- 点击刷新图标（🔄）重新加载所有 Dev Container 窗口

## 项目结构

```
dev-container-group-manager/
├── src/
│   ├── extension.ts              # 插件入口
│   ├── projectManager.ts         # 项目管理
│   ├── groupManager.ts           # 组管理
│   ├── projectsTreeProvider.ts   # 项目树视图
│   └── groupsTreeProvider.ts     # 组树视图
├── package.json                  # 插件配置
├── README.md                     # 用户文档
└── DEVELOPMENT.md                # 开发文档
```

## 核心功能

### ✅ 已实现的功能

1. **自动检测 Dev Container 项目**
   - 扫描 Project Manager 中的所有项目
   - 只显示包含 `.devcontainer` 的项目

2. **Tree View 勾选**
   - 点击项目切换选中状态
   - 绿色勾选图标表示已选中

3. **项目组管理**
   - 保存选中的项目为组
   - 默认创建 "all" 组
   - 删除组（"all" 组不能删除）

4. **批量打开**
   - 支持进度显示
   - 可配置延迟和批次大小
   - 支持取消操作

5. **一键重载**
   - 重新加载所有 Dev Container 窗口

## 配置选项

在 VS Code 设置中搜索 "Dev Container Groups"：

```json
{
  // 每个项目打开之间的延迟（毫秒）
  "devContainerGroups.openDelay": 2000,

  // 每批打开的项目数量
  "devContainerGroups.batchSize": 3,

  // 批次之间的延迟（毫秒）
  "devContainerGroups.batchDelay": 10000,

  // Project Manager 配置文件路径（留空自动检测）
  "devContainerGroups.projectManagerPath": ""
}
```

### 推荐配置

**快速模式**（适合性能好的机器）：
```json
{
  "devContainerGroups.openDelay": 1000,
  "devContainerGroups.batchSize": 5,
  "devContainerGroups.batchDelay": 5000
}
```

**稳定模式**（推荐，更可靠）：
```json
{
  "devContainerGroups.openDelay": 3000,
  "devContainerGroups.batchSize": 2,
  "devContainerGroups.batchDelay": 15000
}
```

## 使用场景示例

### 场景 1：微服务开发
```
需求：订单功能开发
需要打开：
- order-service
- payment-service
- notification-service
- api-gateway

步骤：
1. 在 Projects 视图中勾选这 4 个项目
2. 点击保存图标，命名为 "order-feature"
3. 下次直接点击 "order-feature" 组即可
```

### 场景 2：快速切换需求
```
当前：正在开发订单功能
新需求：切换到用户功能

步骤：
1. 点击 Reload 图标关闭所有窗口
2. 点击 "user-feature" 组
3. 打开新的一组项目
```

## 开发和调试

### 修改代码后重新编译
```bash
npm run compile
```

### 监听模式（自动编译）
```bash
npm run watch
```

### 查看日志
在 Extension Development Host 窗口中：
1. 打开 Output 面板（View > Output）
2. 选择 "Extension Host"

## 打包和发布

### 本地打包
```bash
npm install -g @vscode/vsce
vsce package
```

会生成 `dev-container-group-manager-0.0.1.vsix` 文件。

### 本地安装测试
```bash
code --install-extension dev-container-group-manager-0.0.1.vsix
```

### 发布到市场
```bash
vsce publish
```

## 常见问题

### Q: 没有检测到项目
**解决方案**：
1. 确保安装了 Project Manager 扩展
2. 确保项目包含 `.devcontainer/devcontainer.json`
3. 点击刷新图标重新加载

### Q: 打开项目失败
**解决方案**：
1. 确保 Docker Desktop 正在运行
2. 检查 `devcontainer.json` 配置
3. 增加延迟时间

### Q: 找不到 Project Manager 配置
**解决方案**：
在设置中手动指定路径：
```json
{
  "devContainerGroups.projectManagerPath": "/path/to/projects.json"
}
```

常见路径：
- macOS: `~/Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json`
- Linux: `~/.config/Code/User/globalStorage/alefragnani.project-manager/projects.json`
- Windows: `%APPDATA%\Code\User\globalStorage\alefragnani.project-manager\projects.json`

## 下一步

### 可能的增强功能

1. **组编辑功能**
   - 在 Saved Groups 中编辑组
   - 添加/移除项目

2. **导入导出**
   - 导出组配置为 JSON
   - 分享给团队成员

3. **智能检测**
   - 检测 Docker 资源使用
   - 自动调整打开速度

4. **状态指示**
   - 显示哪些项目已打开
   - 显示容器运行状态

5. **快捷键支持**
   - 为常用操作添加快捷键

## 文档

- **README.md**：用户使用文档
- **DEVELOPMENT.md**：详细的开发文档
- **package.json**：插件配置和命令定义

## 技术栈

- **TypeScript**：类型安全的 JavaScript
- **VS Code Extension API**：插件开发 API
- **TreeDataProvider**：树形视图实现
- **globalState**：持久化存储

## 支持

如有问题或建议，欢迎：
1. 查看 DEVELOPMENT.md 获取详细文档
2. 在项目中添加 Issue 跟踪
3. 提交 Pull Request 贡献代码

---

## 立即开始

```bash
# 1. 打开项目
cd /Users/bytedance/Documents/code/vscode-plugin/dev-container-group-manager
code .

# 2. 按 F5 启动调试

# 3. 在新窗口中使用插件
```

祝你使用愉快！🚀
