# 贡献指南

感谢你对蔚来自动签到脚本项目的关注！我们欢迎所有形式的贡献。

## 🤝 如何贡献

### 报告问题

如果你发现了bug或有功能建议，请：

1. 检查 [Issues](https://github.com/yourusername/weilai-auto-checkin/issues) 确保问题未被报告
2. 使用合适的Issue模板创建新的Issue
3. 提供详细的问题描述和复现步骤

### 提交代码

1. **Fork 仓库**
   ```bash
   git clone https://github.com/yourusername/weilai-auto-checkin.git
   cd weilai-auto-checkin
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **进行修改**
   - 遵循现有的代码风格
   - 添加必要的注释
   - 确保代码可以正常运行

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

5. **推送分支**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建 Pull Request**
   - 提供清晰的PR标题和描述
   - 说明你的更改解决了什么问题
   - 如果相关，请引用相关的Issue

## 📝 代码规范

### JavaScript 代码风格

- 使用4个空格缩进
- 使用分号结束语句
- 使用单引号包围字符串
- 函数和变量使用驼峰命名法
- 常量使用大写字母和下划线

### 注释规范

```javascript
/**
 * 函数描述
 * @param {string} param1 - 参数1描述
 * @param {number} param2 - 参数2描述
 * @returns {boolean} 返回值描述
 */
function exampleFunction(param1, param2) {
    // 单行注释
    return true;
}
```

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

示例：
```
feat: 添加重试机制
fix: 修复token过期问题
docs: 更新README文档
```

## 🧪 测试

在提交PR之前，请确保：

1. 代码能够正常运行
2. 没有语法错误
3. 功能按预期工作
4. 不会破坏现有功能

### 测试步骤

1. 配置正确的token
2. 在Surge中手动执行脚本
3. 检查日志输出
4. 验证通知功能
5. 测试错误处理

## 📋 Issue 模板

### Bug 报告

```markdown
**问题描述**
简要描述遇到的问题

**复现步骤**
1. 执行步骤1
2. 执行步骤2
3. 看到错误

**预期行为**
描述你期望发生的情况

**实际行为**
描述实际发生的情况

**环境信息**
- iOS版本：
- Surge版本：
- 脚本版本：

**日志信息**
```
粘贴相关的错误日志
```

**截图**
如果适用，添加截图来帮助解释问题
```

### 功能请求

```markdown
**功能描述**
简要描述你希望添加的功能

**使用场景**
描述这个功能的使用场景和价值

**实现建议**
如果有实现想法，请描述

**替代方案**
描述你考虑过的其他解决方案
```

## 🎯 开发路线图

### 短期目标
- [ ] 添加更多的错误处理场景
- [ ] 支持多账户签到
- [ ] 添加签到历史记录

### 长期目标
- [ ] 支持其他代理工具
- [ ] 添加Web界面
- [ ] 支持更多汽车品牌

## 📞 联系方式

如果你有任何问题或建议，可以通过以下方式联系：

- 创建 [Issue](https://github.com/yourusername/weilai-auto-checkin/issues)
- 发起 [Discussion](https://github.com/yourusername/weilai-auto-checkin/discussions)

## 📄 许可证

通过贡献代码，你同意你的贡献将在 [MIT License](LICENSE) 下授权。

---

再次感谢你的贡献！🎉