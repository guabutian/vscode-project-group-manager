# Dev Container Group Manager - 开发指南

## 快速开始

### 1. 安装依赖
```bash
cd /Users/bytedance/Documents/code/vscode-plugin/dev-container-group-manager
npm install
```

### 2. 编译项目
```bash
npm run compile
```

### 3. 调试运行
1. 在 VS Code 中打开项目
2. 按 `F5` 或点击 "Run Extension"
3. 会打开一个新的 VS Code 窗口（Extension Development Host）
4. 在新窗口中可以看到侧边栏的 Dev Container Groups 图标

## 功能说明

### 核心功能

#### 1. 项目自动检测
- 自动扫描 Project Manager 中的所有项目
- 只显示包含 `.devcontainer` 配置的项目
- 支持 `devcontainer.json` 和 `docker-compose.yml`

#### 2. Tree View 勾选
- **Projects 视图**：显示所有 Dev Container 项目
- 点击项目名称切换选中状态
- ✓ 表示已选中
- 绿色勾选图标表示选中，空心圆表示未选中

#### 3. 保存为组
- 选中多个项目后，点击保存图标 💾
- 输入组名（如 "microservices-order"）
- 组会保存在 **Saved Groups** 视图中

#### 4. 批量打开
- **打开选中的项目**：点击文件夹图标 📂
- **打开保存的组**：点击组名或右键选择 "Open Group"
- 支持进度显示和取消操作

#### 5. 一键 Reload
- 点击刷新图标 🔄
- 重新加载所有 Dev Container 窗口

### 默认组 "all"
- 首次激活时自动创建
- 包含所有检测到的 Dev Container 项目
- 不能删除（但可以手动更新）

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

### 配置说明

**快速打开模式**（可能不稳定）：
```json
{
  "devContainerGroups.openDelay": 1000,
  "devContainerGroups.batchSize": 5,
  "devContainerGroups.batchDelay": 5000
}
```

**稳定打开模式**（推荐）：
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

操作：
1. 在 Projects 视图中勾选这 4 个项目
2. 点击保存图标，命名为 "order-feature"
3. 下次直接点击 "order-feature" 组即可打开
```

### 场景 2：前后端联调
```
需求：前后端联调
需要打开：
- frontend-web
- backend-api
- admin-dashboard

操作：
1. 勾选这 3 个项目
2. 保存为 "fullstack-dev" 组
3. 一键打开所有项目
```

### 场景 3：快速切换需求
```
当前：正在开发订单功能（order-feature 组）
新需求：需要切换到用户功能

操作：
1. 点击 Reload 图标关闭所有窗口
2. 点击 "user-feature" 组
3. 打开新的一组项目
```

## 项目结构

```
dev-container-group-manager/
├── src/
│   ├── extension.ts              # 插件入口，注册命令和视图
│   ├── projectManager.ts         # 项目管理：扫描、加载、选择
│   ├── groupManager.ts           # 组管理：保存、加载、删除
│   ├── projectsTreeProvider.ts   # Projects 视图提供者
│   └── groupsTreeProvider.ts     # Saved Groups 视图提供者
├── package.json                  # 插件配置和依赖
├── tsconfig.json                 # TypeScript 配置
└── README.md                     # 用户文档
```

## 核心代码说明

### extension.ts
- 插件激活入口
- 注册所有命令
- 实现批量打开逻辑（带进度条）
- 处理延迟和批次控制

### projectManager.ts
- 读取 Project Manager 配置
- 检测 `.devcontainer` 目录
- 管理项目选中状态
- 支持多平台路径（macOS/Linux/Windows）

### groupManager.ts
- 使用 `globalState` 持久化组数据
- 管理组的 CRUD 操作
- "all" 组特殊处理

### projectsTreeProvider.ts
- 实现 `TreeDataProvider` 接口
- 显示项目列表
- 点击切换选中状态
- 图标和描述动态更新

### groupsTreeProvider.ts
- 显示保存的组
- 双击打开组
- 右键菜单（打开/删除）

## 命令列表

| 命令 ID | 标题 | 功能 |
|---------|------|------|
| `devContainerGroups.refresh` | Refresh Projects | 重新加载项目列表 |
| `devContainerGroups.toggleProject` | Toggle Project Selection | 切换项目选中状态 |
| `devContainerGroups.openSelected` | Open Selected Projects | 打开选中的项目 |
| `devContainerGroups.saveAsGroup` | Save as Group | 保存选中项目为组 |
| `devContainerGroups.openGroup` | Open Group | 打开保存的组 |
| `devContainerGroups.deleteGroup` | Delete Group | 删除组 |
| `devContainerGroups.reloadAllWindows` | Reload All Dev Container Windows | 重载所有窗口 |

## 调试技巧

### 1. 查看日志
打开 "Output" 面板，选择 "Extension Host"

### 2. 断点调试
在 TypeScript 代码中设置断点，按 F5 启动调试

### 3. 测试 Project Manager 配置
手动指定配置路径：
```json
{
  "devContainerGroups.projectManagerPath": "/path/to/projects.json"
}
```

### 4. 查看保存的组数据
组数据保存在 VS Code 的 `globalState` 中，可以通过以下方式查看：
```typescript
// 在 extension.ts 中添加调试命令
const groups = context.globalState.get('projectGroups');
console.log(groups);
```

## 常见问题

### Q1: 没有检测到项目
**原因**：
- Project Manager 未安装
- 项目没有 `.devcontainer` 配置
- Project Manager 配置路径不正确

**解决**：
1. 安装 Project Manager 扩展
2. 确保项目包含 `.devcontainer/devcontainer.json`
3. 手动指定配置路径

### Q2: 打开项目失败
**原因**：
- Docker 未运行
- 容器配置错误
- 资源不足

**解决**：
1. 确保 Docker Desktop 正在运行
2. 检查 `devcontainer.json` 配置
3. 减少 `batchSize`，增加延迟

### Q3: 组保存后找不到
**原因**：
- 数据保存在 `globalState` 中，可能被清除

**解决**：
- 重新保存组
- 检查 VS Code 是否正常退出

## 下一步开发

### 可能的增强功能

1. **组编辑功能**
   - 在 Saved Groups 中右键编辑组
   - 添加/移除项目

2. **导入导出**
   - 导出组配置为 JSON
   - 分享给团队成员

3. **智能检测**
   - 检测 Docker 资源使用情况
   - 自动调整打开速度

4. **状态指示**
   - 显示哪些项目已经打开
   - 显示容器运行状态

5. **快捷键支持**
   - 为常用操作添加快捷键

6. **项目标签**
   - 支持给项目打标签
   - 按标签筛选

## 发布到市场

### 1. 打包
```bash
npm install -g @vscode/vsce
vsce package
```

### 2. 发布
```bash
vsce publish
```

### 3. 本地安装测试
```bash
code --install-extension dev-container-group-manager-0.0.1.vsix
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request

### 代码规范
- 使用 TypeScript
- 遵循 ESLint 规则
- 添加必要的注释
- 更新 README

## 许可证

MIT License
