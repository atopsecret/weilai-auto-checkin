/*
 * 蔚来APP Token自动抓取脚本 for Surge
 * 
 * 功能特性:
 * - 自动拦截蔚来APP的签到请求
 * - 提取并保存Authorization token
 * - 自动更新签到脚本的配置
 * - 支持token过期自动重新抓取
 * 
 * 使用方法:
 * 1. 在Surge中添加此脚本的请求拦截规则
 * 2. 在蔚来APP中进行任意操作（签到、浏览等）
 * 3. 脚本会自动抓取并保存token
 * 
 * 作者: GitHub Community
 * 版本: v1.0.0
 * 更新时间: 2024-12-26
 */

// ==================== 配置区域 ====================
const CAPTURE_CONFIG = {
    // Token存储key
    tokenStorageKey: "weilai_auth_token",
    
    // 上次更新时间存储key
    lastUpdateKey: "weilai_token_last_update",
    
    // Token有效期（天）
    tokenValidDays: 30,
    
    // 需要拦截的域名
    targetDomains: [
        "gateway-front-external.nio.com",
        "app.nio.com",
        "api.nio.com"
    ],
    
    // 需要拦截的路径关键词
    targetPaths: [
        "/checkin",
        "/award",
        "/user",
        "/profile",
        "/api"
    ]
};

// ==================== 工具函数 ====================

// 检查URL是否需要拦截
function shouldInterceptRequest(url) {
    const urlObj = new URL(url);
    
    // 检查域名
    const domainMatch = CAPTURE_CONFIG.targetDomains.some(domain => 
        urlObj.hostname.includes(domain)
    );
    
    if (!domainMatch) return false;
    
    // 检查路径
    const pathMatch = CAPTURE_CONFIG.targetPaths.some(path => 
        urlObj.pathname.includes(path)
    );
    
    return pathMatch;
}

// 提取Authorization token
function extractToken(headers) {
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (!authHeader) return null;
    
    // 验证token格式
    if (authHeader.startsWith('Bearer ') && authHeader.length > 20) {
        return authHeader;
    }
    
    return null;
}

// 保存token到本地存储
function saveToken(token) {
    const currentTime = Date.now();
    
    // 保存token
    $persistentStore.write(token, CAPTURE_CONFIG.tokenStorageKey);
    
    // 保存更新时间
    $persistentStore.write(currentTime.toString(), CAPTURE_CONFIG.lastUpdateKey);
    
    console.log("✅ Token已保存到本地存储");
    console.log(`🔑 Token: ${token.substring(0, 20)}...`);
    console.log(`📅 保存时间: ${new Date(currentTime).toLocaleString('zh-CN')}`);
    
    return true;
}

// 获取已保存的token
function getSavedToken() {
    const token = $persistentStore.read(CAPTURE_CONFIG.tokenStorageKey);
    const lastUpdate = $persistentStore.read(CAPTURE_CONFIG.lastUpdateKey);
    
    if (!token || !lastUpdate) return null;
    
    return {
        token: token,
        lastUpdate: parseInt(lastUpdate),
        isExpired: isTokenExpired(parseInt(lastUpdate))
    };
}

// 检查token是否过期
function isTokenExpired(lastUpdate) {
    const now = Date.now();
    const expireTime = lastUpdate + (CAPTURE_CONFIG.tokenValidDays * 24 * 60 * 60 * 1000);
    return now > expireTime;
}

// 发送通知
function sendNotification(title, subtitle, body) {
    $notification.post(title, subtitle, body);
}

// ==================== 主要功能 ====================

// Token拦截处理函数
function handleTokenCapture(request) {
    const url = request.url;
    const headers = request.headers;
    
    console.log(`🔍 拦截到请求: ${url}`);
    
    // 检查是否需要拦截
    if (!shouldInterceptRequest(url)) {
        console.log("⏭️ 跳过此请求");
        return;
    }
    
    // 提取token
    const token = extractToken(headers);
    if (!token) {
        console.log("❌ 未找到有效的Authorization token");
        return;
    }
    
    // 检查是否是新token
    const savedTokenInfo = getSavedToken();
    if (savedTokenInfo && savedTokenInfo.token === token && !savedTokenInfo.isExpired) {
        console.log("ℹ️ Token未变化且未过期，跳过保存");
        return;
    }
    
    // 保存新token
    if (saveToken(token)) {
        const message = savedTokenInfo ? "Token已更新" : "Token已获取";
        sendNotification("蔚来Token抓取", message, "签到脚本将自动使用新token");
    }
}

// 获取token的公共接口（供签到脚本调用）
function getValidToken() {
    const tokenInfo = getSavedToken();
    
    if (!tokenInfo) {
        console.log("❌ 未找到保存的token");
        return null;
    }
    
    if (tokenInfo.isExpired) {
        console.log("⚠️ Token已过期，需要重新抓取");
        sendNotification("蔚来Token", "Token已过期", "请在蔚来APP中进行操作以更新token");
        return null;
    }
    
    console.log("✅ 获取到有效token");
    console.log(`📅 上次更新: ${new Date(tokenInfo.lastUpdate).toLocaleString('zh-CN')}`);
    
    return tokenInfo.token;
}

// 清除保存的token
function clearToken() {
    $persistentStore.write("", CAPTURE_CONFIG.tokenStorageKey);
    $persistentStore.write("", CAPTURE_CONFIG.lastUpdateKey);
    console.log("🗑️ Token已清除");
    sendNotification("蔚来Token", "Token已清除", "下次使用时将重新抓取");
}

// ==================== 脚本入口 ====================

// 主函数 - 根据调用方式执行不同逻辑
function main() {
    // 如果是HTTP请求拦截模式
    if (typeof $request !== 'undefined' && $request) {
        console.log("🎯 Token拦截模式启动");
        handleTokenCapture($request);
        $done({});
        return;
    }
    
    // 如果是手动调用模式
    console.log("📱 Token管理模式启动");
    console.log("当前时间:", new Date().toLocaleString('zh-CN'));
    
    const tokenInfo = getSavedToken();
    if (tokenInfo) {
        console.log("📊 Token状态:");
        console.log(`🔑 Token: ${tokenInfo.token.substring(0, 30)}...`);
        console.log(`📅 更新时间: ${new Date(tokenInfo.lastUpdate).toLocaleString('zh-CN')}`);
        console.log(`⏰ 是否过期: ${tokenInfo.isExpired ? '是' : '否'}`);
        
        if (tokenInfo.isExpired) {
            sendNotification("蔚来Token", "Token已过期", "请在蔚来APP中进行操作以更新token");
        } else {
            const remainingDays = Math.ceil((tokenInfo.lastUpdate + CAPTURE_CONFIG.tokenValidDays * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000));
            sendNotification("蔚来Token", "Token状态正常", `剩余有效期: ${remainingDays} 天`);
        }
    } else {
        console.log("❌ 未找到保存的token");
        sendNotification("蔚来Token", "未找到Token", "请在蔚来APP中进行操作以获取token");
    }
    
    $done();
}

// 执行脚本
main();

// ==================== 导出函数 ====================
// 这些函数可以被其他脚本调用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getValidToken,
        clearToken,
        isTokenExpired: () => {
            const tokenInfo = getSavedToken();
            return tokenInfo ? tokenInfo.isExpired : true;
        }
    };
}