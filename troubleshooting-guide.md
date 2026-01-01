# 蔚来自动签到 Surge 配置故障排除指南

## 问题现象
- Surge MITM 设置正确（HTTPS解密已开启，证书已安装）
- 脚本配置已添加到 Surge
- 但是没有收到任何通知，脚本似乎没有拦截到请求

## 排查步骤

### 第一步：验证脚本基本功能
1. 使用 `surge-debug-simple.conf` 中的配置
2. 重新加载 Surge 配置
3. 访问任意 HTTPS 网站（如 https://www.baidu.com）
4. 查看 Surge 日志是否有脚本执行记录

**期望结果：** 应该看到脚本执行日志和通知

### 第二步：检查蔚来域名拦截
1. 确保 MITM hostname 包含：
   ```
   hostname = *.nio.com, gateway-front-external.nio.com, app.nio.com
   ```
2. 打开蔚来 APP，进行任意操作（浏览、刷新等）
3. 查看 Surge 请求记录中是否有 nio.com 相关请求

**期望结果：** 在 Surge 请求列表中看到蔚来相关请求

### 第三步：检查脚本拦截规则
当前使用的拦截规则：
```
蔚来Token抓取 = type=http-request,pattern=^https://(gateway-front-external\.nio\.com|app\.nio\.com|api\.nio\.com)/.*,script-path=https://raw.githubusercontent.com/atopsecret/weilai-auto-checkin/main/weilai-auto-checkin.js,timeout=10
```

如果不工作，尝试更宽泛的规则：
```
蔚来Token抓取 = type=http-request,pattern=^https://.*\.nio\.com.*,script-path=https://raw.githubusercontent.com/atopsecret/weilai-auto-checkin/main/weilai-auto-checkin.js,timeout=10
```

### 第四步：使用调试脚本
1. 将 `weilai-debug-script.js` 上传到可访问的位置
2. 修改脚本路径为调试脚本
3. 重新测试

### 第五步：检查网络和权限
1. 确认 Surge 有网络访问权限
2. 确认可以访问 GitHub（脚本托管位置）
3. 尝试手动访问脚本URL确认可达性

## 常见问题解决方案

### 问题1：脚本完全不执行
**原因：** Surge 配置语法错误或脚本路径无法访问
**解决：** 
- 检查配置文件语法
- 确认网络可以访问 GitHub
- 尝试使用本地脚本文件

### 问题2：脚本执行但不拦截蔚来请求
**原因：** 拦截规则不匹配实际请求URL
**解决：**
- 使用更宽泛的拦截规则 `^https://.*\.nio\.com.*`
- 检查 MITM hostname 配置
- 确认蔚来APP确实发送了HTTPS请求

### 问题3：拦截到请求但没有找到token
**原因：** 蔚来APP的请求可能不包含所需的Authorization头
**解决：**
- 在蔚来APP中进行签到操作（而不是仅仅浏览）
- 检查其他可能的认证头字段
- 查看完整的请求头信息

### 问题4：Token保存失败
**原因：** Surge 存储权限问题
**解决：**
- 检查 Surge 应用权限
- 尝试重启 Surge
- 使用其他存储方式

## 调试命令

### 查看 Surge 脚本日志
在 Surge 应用中：设置 → 脚本 → 查看日志

### 手动触发脚本测试
访问以下URL（需要先配置URL重写规则）：
- 手动签到：https://weilai.checkin
- 查看Token状态：https://weilai.token

### 检查网络连接
```bash
curl -I https://raw.githubusercontent.com/atopsecret/weilai-auto-checkin/main/weilai-auto-checkin.js
```

## 推荐的调试配置

```conf
[Script]
# 调试用 - 拦截所有请求（临时使用）
全局调试 = type=http-request,pattern=^https://.*,script-path=https://raw.githubusercontent.com/atopsecret/weilai-auto-checkin/main/weilai-debug-script.js,timeout=10

# 蔚来专用拦截
蔚来拦截 = type=http-request,pattern=^https://.*\.nio\.com.*,script-path=https://raw.githubusercontent.com/atopsecret/weilai-auto-checkin/main/weilai-auto-checkin.js,timeout=10

[MITM]
hostname = *.nio.com

[URL Rewrite]
^https://test$ https://manual-test.debug 302
```

## 联系支持
如果按照以上步骤仍无法解决问题，请提供：
1. Surge 版本信息
2. iOS 系统版本
3. 蔚来APP版本
4. 完整的 Surge 配置文件（隐私信息除外）
5. Surge 脚本执行日志
6. 具体的错误信息或现象描述