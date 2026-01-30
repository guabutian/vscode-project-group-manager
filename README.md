# Dev Container 项目组管理器

一个用于批量打开 Dev Container 项目并支持分组管理的 VS Code 扩展。

## 功能特性

- 📦 **自动载入Project项目**：自动扫描 Project Manager的配置文件
- ✅ **树形视图勾选**：在可视化树形视图中勾选/取消勾选项目
- 📁 **分组管理**：将选中的项目保存为命名组，方便快速访问
- 🚀 **批量打开**：支持可配置延迟的批量打开多个项目

## 使用方法

## 配置选项

```json
{
    // 每个项目打开之间的延迟（毫秒）
    "projectGroupManager.openDelay": 2000,
    // 每批打开的项目数量
    "projectGroupManager.batchSize": 3,
    // 批次之间的延迟（毫秒）
    "projectGroupManager.batchDelay": 10000,
    // Project Manager 配置文件的自定义路径
    "projectGroupManager.projectManagerPath": ""
}
```

## 依赖要求

> 本次只适配的了mac下的Project Manager扩展

- [Project Manager](https://marketplace.visualstudio.com/items?itemName=alefragnani.project-manager) 扩展
