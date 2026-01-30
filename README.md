# Project Group Manager

一个强大的 VS Code 扩展，用于批量管理和打开项目。支持本地项目、Dev Container、SSH Remote、WSL 等多种项目类型，让你轻松管理大量项目。

## ✨ 功能特性

- 📦 **自动载入项目**：自动扫描 Project Manager 的配置文件，无需手动导入
- ✅ **可视化选择**：在树形视图中勾选/取消勾选项目，直观便捷
- 📁 **分组管理**：将常用项目保存为命名组，一键打开整个项目组
- 🚀 **批量打开**：支持批量打开多个项目，可配置延迟避免系统卡顿
- 🔍 **快速搜索**：快速搜索和定位项目
- 🎯 **多种视图模式**：支持平铺、按类型分组、按路径分组、按选中状态分组等多种显示模式
- 🌐 **多环境支持**：支持本地项目、Dev Container、SSH Remote、WSL 等多种项目类型
- ⚙️ **灵活配置**：可自定义打开延迟、批次大小等参数
- 🎨 **权重排序**：为项目组设置权重，按优先级排序

## 📦 安装

### 从 VS Code Marketplace 安装

1. 打开 VS Code
2. 按 `Cmd+Shift+X` (macOS) 或 `Ctrl+Shift+X` (Windows/Linux) 打开扩展面板
3. 搜索 "Project Group Manager"
4. 点击安装

### 从 VSIX 文件安装

1. 下载 `.vsix` 文件
2. 打开 VS Code
3. 按 `Cmd+Shift+P` (macOS) 或 `Ctrl+Shift+P` (Windows/Linux)
4. 输入 "Install from VSIX"
5. 选择下载的 `.vsix` 文件

## 🚀 使用方法

### 基础使用

1. **查看项目列表**
   - 点击侧边栏的 Project Groups 图标
   - 在"项目列表"视图中查看所有项目

2. **选择项目**
   - 点击项目前的复选框勾选项目
   - 可以勾选多个项目

3. **保存为组**
   - 勾选需要的项目后，点击工具栏的"保存为组"按钮
   - 输入组名称
   - 组会出现在"组合列表"视图中

4. **打开项目组**
   - 在"组合列表"中右键点击组
   - 选择"打开组"
   - 所有项目会按配置的延迟依次打开

### 高级功能

#### 视图模式切换

点击"项目列表"工具栏的"显示模式"按钮，可以选择：
- **平铺展示**：所有项目平铺显示
- **按类型分组**：按项目类型（本地、Dev Container、SSH、WSL）分组
- **按路径分组**：按项目路径分组
- **按选中状态分组**：将已选中和未选中的项目分开显示

#### 项目操作

在项目上右键可以：
- **打开项目**：在新窗口打开单个项目
- **重命名**：修改项目显示名称
- **添加到组合**：将项目添加到已有的组
- **删除**：从列表中删除项目

#### 组合操作

在组合上右键可以：
- **打开组**：批量打开组内所有项目
- **重命名**：修改组名称
- **复制**：复制组（创建副本）
- **设置权重分**：设置组的优先级（权重越高越靠前）
- **删除组**：删除该组

#### 快速搜索

点击工具栏的搜索按钮，输入关键词快速定位项目。

## ⚙️ 配置选项

在 VS Code 设置中搜索 "Project Group Manager" 或直接编辑 `settings.json`：

```json
{
  // 每个项目打开之间的延迟（毫秒）
  "projectGroups.openDelay": 2000,

  // 每批打开的项目数量
  "projectGroups.batchSize": 3,

  // 批次之间的延迟（毫秒）
  "projectGroups.batchDelay": 10000,

  // Project Manager 配置文件的自定义路径（留空自动检测）
  "projectGroups.projectManagerPath": "",

  // 显示操作完成通知
  "projectGroups.showNotifications": true,

  // 启动时自动刷新项目列表
  "projectGroups.autoRefreshOnStartup": true
}
```

### 配置说明

- **openDelay**：控制每个项目打开的间隔时间，避免同时打开太多窗口导致系统卡顿
- **batchSize**：每批打开的项目数量，建议设置为 3-5 个
- **batchDelay**：批次之间的延迟，给系统足够的时间处理已打开的项目
- **projectManagerPath**：如果 Project Manager 配置文件不在默认位置，可以手动指定路径
- **showNotifications**：是否显示操作完成的通知消息
- **autoRefreshOnStartup**：启动 VS Code 时是否自动刷新项目列表

## 📋 依赖要求

### 必需依赖

- [Project Manager](https://marketplace.visualstudio.com/items?itemName=alefragnani.project-manager) 扩展

### 系统要求

- VS Code 版本：1.80.0 或更高
- 操作系统：目前仅支持 macOS（Windows 和 Linux 支持即将推出）

## 🎯 使用场景

### 场景 1：微服务开发

如果你在开发微服务项目，需要同时打开多个服务：
1. 在 Project Manager 中添加所有微服务项目
2. 在 Project Group Manager 中勾选需要的服务
3. 保存为"微服务-开发环境"组
4. 下次开发时，一键打开整个项目组

### 场景 2：前后端分离项目

将前端、后端、管理后台等项目保存为一个组，快速启动整个开发环境。

### 场景 3：多客户端项目

如果你维护多个客户的项目，可以为每个客户创建一个项目组，快速切换工作环境。

### 场景 4：Dev Container 开发

批量打开多个 Dev Container 项目，自动启动容器环境。

## 🔧 故障排除

### 项目列表为空

1. 确保已安装 Project Manager 扩展
2. 在 Project Manager 中至少添加一个项目
3. 点击刷新按钮重新加载项目列表
4. 检查配置中的 `projectManagerPath` 是否正确

### 项目打开失败

1. 检查项目路径是否存在
2. 对于 Dev Container 项目，确保 Docker 正在运行
3. 对于 SSH 项目，确保 SSH 配置正确
4. 查看 VS Code 输出面板的错误信息

### 打开速度慢

1. 减少 `batchSize` 的值
2. 增加 `openDelay` 和 `batchDelay` 的值
3. 关闭不必要的扩展以提高性能

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 🔗 相关链接

- [GitHub 仓库](https://github.com/your-username/project-group-manager)
- [问题反馈](https://github.com/your-username/project-group-manager/issues)
- [Project Manager 扩展](https://marketplace.visualstudio.com/items?itemName=alefragnani.project-manager)

---

**享受高效的项目管理体验！** 🎉
