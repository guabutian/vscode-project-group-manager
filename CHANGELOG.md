# 更新日志

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 计划功能
- 组编辑功能
- 项目搜索和过滤
- 快捷键支持
- 导入导出组配置

## [0.0.1] - 2026-01-29

### 新增
- 🎉 初始版本发布
- ✨ 自动检测 Dev Container 项目
  - 扫描 Project Manager 配置
  - 检测 `.devcontainer` 目录
  - 支持 `devcontainer.json` 和 `docker-compose.yml`
- 🌲 Tree View 交互
  - 项目列表视图
  - 点击切换选中状态
  - 绿色勾选图标表示选中
  - 实时刷新视图
- 📁 项目组管理
  - 保存选中项目为组
  - 组名验证
  - 默认创建 "all" 组
  - 删除组功能
  - 持久化存储
- 🚀 批量打开功能
  - 打开选中的项目
  - 打开保存的组
  - 进度条显示
  - 可取消操作
  - 批次控制
- 🔄 窗口管理
  - 一键重载所有窗口
  - 强制新窗口打开
- ⚙️ 配置选项
  - 项目间延迟配置
  - 批次大小配置
  - 批次间延迟配置
  - 自定义 Project Manager 路径
- 🌏 中文本地化
  - 界面中文化
  - 提示消息中文化
  - 文档中文化

### 技术实现
- TypeScript 5.1.6
- VS Code Extension API 1.80.0
- TreeDataProvider 实现
- globalState 持久化
- 跨平台路径支持（macOS/Linux/Windows）

### 文档
- README.md - 用户使用文档
- QUICKSTART.md - 快速开始指南
- DEVELOPMENT.md - 开发者文档
- EXAMPLES.md - 使用示例和最佳实践
- PROJECT_SUMMARY.md - 项目总结

### 配置
- ESLint 代码检查
- TypeScript 严格模式
- EditorConfig 编辑器配置

## [类型说明]

### 新增 (Added)
新功能

### 变更 (Changed)
现有功能的变更

### 弃用 (Deprecated)
即将移除的功能

### 移除 (Removed)
已移除的功能

### 修复 (Fixed)
任何 bug 修复

### 安全 (Security)
修复安全问题

---

## 版本规划

### v0.1.0 - 基础增强（计划中）
- [ ] 组编辑功能
  - 在 Saved Groups 中右键编辑
  - 添加/移除项目
  - 重命名组
- [ ] 项目搜索和过滤
  - 按名称搜索
  - 按路径过滤
  - 按标签过滤
- [ ] 快捷键支持
  - Cmd/Ctrl + Shift + G: 打开视图
  - Cmd/Ctrl + Shift + O: 打开选中项目
  - Cmd/Ctrl + Shift + S: 保存为组
- [ ] 状态栏显示
  - 显示当前打开的项目数
  - 快速访问组

### v0.2.0 - 高级功能（计划中）
- [ ] 导入导出
  - 导出组配置为 JSON
  - 从 JSON 导入组
  - 分享给团队成员
- [ ] 项目标签
  - 为项目添加标签
  - 按标签筛选
  - 标签管理
- [ ] 智能检测
  - 检测 Docker 资源使用
  - 自动调整打开速度
  - 容器健康检查
- [ ] 容器状态
  - 显示容器运行状态
  - 显示容器资源使用
  - 快速重启容器

### v0.3.0 - 用户体验（计划中）
- [ ] 自定义主题
  - 图标主题
  - 颜色主题
- [ ] 拖拽排序
  - 项目排序
  - 组排序
- [ ] 批量操作
  - 全选/取消全选
  - 反选
  - 批量删除组
- [ ] 历史记录
  - 最近打开的组
  - 快速访问

### v1.0.0 - 正式版本（计划中）
- [ ] 团队协作
  - 共享组配置
  - 团队模板
- [ ] 云端同步
  - 跨设备同步组配置
  - 备份和恢复
- [ ] 插件市场发布
  - 完整测试
  - 性能优化
  - 文档完善
- [ ] 多语言支持
  - 英文
  - 中文
  - 其他语言

---

## 贡献指南

如果你想为此项目做出贡献，请：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

请确保：
- 代码遵循项目的编码规范
- 添加适当的测试
- 更新相关文档
- 在 CHANGELOG.md 中记录变更

---

## 反馈和支持

如果你发现 bug 或有功能建议，请：

1. 查看现有的 Issues
2. 如果没有相关 Issue，创建新的 Issue
3. 提供详细的描述和复现步骤
4. 附加相关的日志和截图

感谢你的支持！🙏
