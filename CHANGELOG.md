# 更新日志

所有重要的项目变更都会记录在此文件中。

## [0.0.3] - 2026-01-31

### 重大改进

- 🔄 **组合列表存储方式重构**：从 Profile 隔离的 globalState 改为文件系统存储
  - 所有 Profile 现在共享同一份组合配置
  - 配置文件位置：`~/Library/Application Support/Code/User/globalStorage/guabutian.project-group-manager/groups.json`（macOS）
  - 自动从旧版本迁移数据

### 新增功能

- ➕ 新增"编辑组合配置文件"命令，可直接编辑 groups.json
- ⚙️ 新增配置项 `projectGroups.groupsConfigPath`，支持自定义组合配置文件路径

### 修复问题

- 🐛 修复不同 Profile 之间无法共享组合列表的问题
- 🐛 修复切换 Profile 后组合数据丢失的问题

### 技术改进

- 📦 组合数据持久化方式优化，与 Project Manager 保持一致
- 🔧 改进配置文件读写逻辑，增强错误处理

## [0.0.2] - 2026-01-30

### 改进

- 📝 优化文档和说明
- 🐛 修复一些小问题

## [0.0.1] - 2026-01-30

### 新增功能

- 🎉 首次发布
- 📦 自动载入 Project Manager 的项目配置
- ✅ 树形视图中可视化勾选/取消勾选项目
- 📁 项目分组管理功能
- 🚀 批量打开多个项目，支持可配置延迟
- 🔍 项目快速搜索功能
- 🎯 多种视图模式：
  - 平铺展示
  - 按类型分组（本地、Dev Container、SSH、WSL）
  - 按路径分组
  - 按选中状态分组
- 🌐 支持多种项目类型：
  - 本地项目
  - Dev Container 项目
  - SSH Remote 项目
  - WSL 项目
- ⚙️ 丰富的配置选项：
  - 项目打开延迟
  - 批次大小
  - 批次延迟
  - 自定义配置文件路径
  - 通知开关
  - 自动刷新
- 🎨 项目组权重排序功能
- 📝 项目和组的重命名功能
- 📋 组的复制功能
- 🗑️ 项目和组的删除功能
- ➕ 将项目添加到已有组的功能
- ➖ 从组中移除项目的功能

### 已知限制

- 目前仅支持 macOS 系统
- 依赖 Project Manager 扩展

### 技术细节

- 基于 VS Code Extension API 1.80.0+
- 使用 TypeScript 开发
- 支持树形视图和自定义命令
