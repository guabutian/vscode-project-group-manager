# 调试指南

## 快速重新加载

修改代码后，有两种方式重新加载插件：

### 方式 1：在 Extension Development Host 窗口中
1. 按 `Cmd+R` (macOS) 或 `Ctrl+R` (Windows/Linux)
2. 窗口会重新加载，插件会使用最新代码

### 方式 2：重新启动调试
1. 在开发窗口中停止调试（点击红色方块）
2. 按 `F5` 重新启动
3. 会打开新的 Extension Development Host 窗口

## 查看日志

### 1. Extension Host 日志
```
View > Output > 选择 "Extension Host"
```

这里会显示：
- `console.log()` 输出
- `console.error()` 错误
- 插件激活信息

### 2. 开发者工具
```
Help > Toggle Developer Tools
```

可以：
- 查看完整的控制台输出
- 设置断点调试
- 查看网络请求
- 检查内存使用

## 添加调试日志

在代码中添加日志来追踪问题：

```typescript
// 在 projectManager.ts 的 loadProjects() 中
async loadProjects(): Promise<void> {
    console.log('🔍 开始加载项目...');
    this.projects = [];

    const projectManagerProjects = await this.loadFromProjectManager();
    console.log(`📦 从 Project Manager 加载了 ${projectManagerProjects.length} 个项目`);

    for (const project of projectManagerProjects) {
        console.log(`🔎 检查项目: ${project.name}`);
        console.log(`   路径: ${project.path}`);

        if (this.isDevContainerProject(project.path)) {
            console.log(`   ✅ 是 Dev Container 项目`);
            this.projects.push({
                ...project,
                hasDevContainer: true
            });
        } else {
            console.log(`   ❌ 不是 Dev Container 项目`);
        }
    }

    console.log(`✨ 最终检测到 ${this.projects.length} 个 Dev Container 项目`);
    this.projects.sort((a, b) => a.name.localeCompare(b.name));
}
```

## 常见问题排查

### 问题 1：项目列表为空

**检查步骤**：

1. **查看 Output 日志**
   ```
   View > Output > Extension Host
   ```
   查找：
   - "Dev Container 项目组管理器已激活"
   - "从 Project Manager 加载了 X 个项目"
   - "最终检测到 X 个 Dev Container 项目"

2. **检查 Project Manager 配置路径**
   ```typescript
   // 在 projectManager.ts 的 getProjectManagerConfigPath() 中添加
   console.log('🔍 检查配置路径:', path);
   ```

3. **手动验证配置文件**
   ```bash
   cat "/Users/bytedance/Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json" | grep "dev-container"
   ```

### 问题 2：无法打开项目

**检查步骤**：

1. **查看错误信息**
   ```typescript
   // 在 extension.ts 的 openDevContainer() 中添加
   console.log('🚀 尝试打开项目:', projectPath);

   try {
       // ... 打开逻辑
       console.log('✅ 项目打开成功');
   } catch (error) {
       console.error('❌ 打开失败:', error);
   }
   ```

2. **检查 URI 格式**
   ```typescript
   console.log('URI 类型:', projectPath.startsWith('vscode-remote://') ? '远程' : '本地');
   ```

3. **手动测试打开**
   - 在命令面板中运行：`Remote-Containers: Open Folder in Container`
   - 选择一个项目测试是否能正常打开

### 问题 3：组保存失败

**检查步骤**：

1. **查看 globalState**
   ```typescript
   // 在 groupManager.ts 的 saveGroups() 中添加
   console.log('💾 保存组:', groupsArray);
   ```

2. **验证保存成功**
   ```typescript
   // 在 saveGroups() 后添加
   const saved = this.context.globalState.get<ProjectGroup[]>('projectGroups', []);
   console.log('✅ 已保存的组:', saved);
   ```

### 问题 4：刷新后项目消失

**可能原因**：
- Project Manager 配置文件路径错误
- 配置文件格式变化
- 权限问题

**解决方案**：
```typescript
// 在 loadFromProjectManager() 中添加详细日志
console.log('📂 配置文件路径:', configPath);
console.log('📄 配置文件存在:', fs.existsSync(configPath));

if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    console.log('📝 配置文件大小:', content.length, 'bytes');

    const config = JSON.parse(content);
    console.log('📊 配置格式:', Array.isArray(config) ? '数组' : '对象');
}
```

## 断点调试

### 设置断点

1. 在 VS Code 中打开源文件（如 `projectManager.ts`）
2. 点击行号左侧设置断点（红点）
3. 按 `F5` 启动调试
4. 在 Extension Development Host 中触发功能
5. 代码会在断点处暂停

### 常用断点位置

```typescript
// projectManager.ts
async loadProjects(): Promise<void> {
    debugger; // 在这里设置断点
    // ...
}

// extension.ts
vscode.commands.registerCommand('devContainerGroups.openSelected', async () => {
    debugger; // 在这里设置断点
    // ...
});
```

### 调试技巧

1. **查看变量值**
   - 鼠标悬停在变量上
   - 或在 Debug 面板的 Variables 中查看

2. **执行表达式**
   - 在 Debug Console 中输入表达式
   - 例如：`this.projects.length`

3. **单步执行**
   - `F10`: Step Over（跳过函数）
   - `F11`: Step Into（进入函数）
   - `Shift+F11`: Step Out（跳出函数）
   - `F5`: Continue（继续执行）

## 性能分析

### 检查加载时间

```typescript
async loadProjects(): Promise<void> {
    const startTime = Date.now();
    console.log('⏱️ 开始加载项目...');

    // ... 加载逻辑

    const endTime = Date.now();
    console.log(`⏱️ 加载完成，耗时: ${endTime - startTime}ms`);
}
```

### 检查内存使用

```typescript
console.log('💾 内存使用:', process.memoryUsage());
```

## 测试不同场景

### 场景 1：空项目列表

```typescript
// 临时修改 loadFromProjectManager() 返回空数组
return [];
```

### 场景 2：大量项目

```typescript
// 临时添加测试数据
for (let i = 0; i < 100; i++) {
    projects.push({
        name: `test-project-${i}`,
        path: `vscode-remote://dev-container+test${i}`,
        hasDevContainer: false
    });
}
```

### 场景 3：错误处理

```typescript
// 临时抛出错误测试错误处理
throw new Error('测试错误');
```

## 用户反馈收集

### 添加遥测日志

```typescript
// 记录用户操作
console.log('📊 用户操作:', {
    action: 'openProjects',
    projectCount: selected.length,
    timestamp: new Date().toISOString()
});
```

### 错误上报

```typescript
try {
    // ... 操作
} catch (error) {
    console.error('❌ 错误详情:', {
        message: error.message,
        stack: error.stack,
        context: {
            projectCount: this.projects.length,
            selectedCount: this.selectedPaths.size
        }
    });
}
```

## 快速测试脚本

创建一个测试脚本来快速验证功能：

```typescript
// test.ts
import * as vscode from 'vscode';

export async function runTests() {
    console.log('🧪 开始测试...');

    // 测试 1：检查项目数量
    const projects = await vscode.commands.executeCommand('devContainerGroups.getProjects');
    console.log(`✅ 测试 1: 项目数量 = ${projects.length}`);

    // 测试 2：检查组数量
    const groups = await vscode.commands.executeCommand('devContainerGroups.getGroups');
    console.log(`✅ 测试 2: 组数量 = ${groups.length}`);

    console.log('🎉 测试完成');
}
```

## 发布前检查清单

- [ ] 所有功能正常工作
- [ ] 没有 console.log 调试代码（或已注释）
- [ ] 错误处理完善
- [ ] 用户提示友好
- [ ] 性能可接受
- [ ] 内存无泄漏
- [ ] 代码已格式化
- [ ] 文档已更新

## 获取帮助

如果遇到问题：

1. **查看文档**
   - README.md
   - QUICKSTART.md
   - EXAMPLES.md
   - FIX_REMOTE_PROJECTS.md

2. **查看日志**
   - Extension Host Output
   - Developer Tools Console

3. **搜索错误信息**
   - VS Code Extension API 文档
   - Stack Overflow
   - GitHub Issues

4. **简化问题**
   - 创建最小复现示例
   - 逐步排除可能的原因

---

## 当前状态检查

运行以下命令检查当前状态：

```bash
# 1. 检查编译状态
npm run compile

# 2. 检查代码风格
npm run lint

# 3. 查看项目文件
ls -la src/

# 4. 查看编译输出
ls -la out/

# 5. 检查 Project Manager 配置
cat "/Users/bytedance/Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json" | grep -c "dev-container"
```

预期输出：
- 编译成功，无错误
- 代码检查通过
- src/ 目录包含 5 个 .ts 文件
- out/ 目录包含对应的 .js 文件
- Project Manager 配置中有 9 个 dev-container 项目

现在请重新测试插件！🚀
