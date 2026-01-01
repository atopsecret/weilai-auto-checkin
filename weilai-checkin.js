/*
 * 蔚来APP自动签到脚本 for Surge
 * 
 * 功能特性:
 * - 自动签到蔚来APP
 * - 显示连续签到天数和累计天数
 * - 支持Surge定时任务
 * - 签到结果通知
 * - 错误处理和重试机制
 * 
 * 使用方法:
 * 1. 修改CONFIG中的authorization为你的实际token
 * 2. 在Surge中添加定时任务
 * 3. 享受自动签到
 * 
 * 作者: GitHub Community
 * 版本: v1.2.0
 * 更新时间: 2024-12-26
 * 仓库地址: https://github.com/yourusername/weilai-auto-checkin
 */

// ==================== 配置区域 ====================
// 请根据你的实际情况修改以下配置
const CONFIG = {
    // 基础URL - 蔚来签到接口地址
    baseURL: "https://gateway-front-external.nio.com",
    
    // 用户认证信息 - 需要替换为你的实际token
    // 获取方法: 使用Surge抓包蔚来APP签到请求中的Authorization字段
    authorization: "Bearer 2.0q33I2F3to53T0WjoCYuZu4Zgn+wOKpatLnOuiHxnw18=", // ⚠️ 请替换为你的token
    
    // APP信息
    appId: "10086",
    
    // User-Agent - 模拟蔚来APP的webview
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NIOAppCN/5.48.5 (com.do1.WeiLaiApp; build:2549; OS:iOS) webview/lg _dsbridge",
    
    // 重试配置
    maxRetries: 3,
    retryDelay: 2000 // 重试间隔(毫秒)
};

// ==================== 工具函数 ====================

// 生成随机UUID (用于请求追踪)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 格式化日期时间
function formatDateTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 核心功能 ====================

// 生成请求参数
function buildParams() {
    const timestamp = Date.now(); // 使用毫秒时间戳
    return {
        app_id: CONFIG.appId,
        timestamp: timestamp
    };
}

// 构建请求URL
function buildURL(params) {
    const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
    
    return `${CONFIG.baseURL}/moat/10086/c/award_cn/checkin?${queryString}`;
}

// 构建请求头
function buildHeaders() {
    return {
        "authority": "gateway-front-external.nio.com",
        "content-type": "application/x-www-form-urlencoded",
        "accept": "application/json, text/plain, */*",
        "authorization": CONFIG.authorization,
        "sec-fetch-site": "cross-site",
        "priority": "u=3, i",
        "accept-language": "zh-CN,zh-Hans;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "sec-fetch-mode": "cors",
        "origin": "null",
        "user-agent": CONFIG.userAgent,
        "sec-fetch-dest": "empty"
    };
}

// 处理签到响应
function handleResponse(response, data) {
    try {
        const result = JSON.parse(data);
        
        // 检查签到结果
        if (response.status === 200 && result.result_code === 'success') {
            const stats = result.data?.stats || {};
            const tip = result.data?.tip || "签到完成";
            const continuousDays = stats.continuous_checkin_days || 0;
            const accumulateDays = stats.accumulate_days || 0;
            const checkinTime = stats.checkin_time ? formatDateTime(stats.checkin_time) : '';
            
            console.log("✅ 签到成功!");
            console.log(`📅 签到时间: ${checkinTime}`);
            console.log(`🔥 连续签到: ${continuousDays} 天`);
            console.log(`📊 累计签到: ${accumulateDays} 天`);
            
            const message = `${tip}\n📊 累计签到: ${accumulateDays} 天`;
            $notification.post("蔚来签到", "签到成功 🎉", message);
            
            return { success: true, message: tip };
            
        } else if (result.data?.checked_in === true) {
            const tip = result.data?.tip || "今日已签到";
            console.log("ℹ️ 今日已签到");
            console.log(`💡 提示: ${tip}`);
            
            $notification.post("蔚来签到", "今日已签到 ✅", tip);
            return { success: true, message: tip };
            
        } else {
            const errorMsg = result.message || result.error || "签到失败";
            console.log("❌ 签到失败:", result);
            
            $notification.post("蔚来签到", "签到失败 ❌", errorMsg);
            return { success: false, message: errorMsg };
        }
    } catch (e) {
        console.log("❌ 解析响应失败:", e);
        console.log("📄 原始响应:", data);
        
        $notification.post("蔚来签到", "解析失败 ⚠️", "响应格式异常");
        return { success: false, message: "响应解析异常" };
    }
}

// 执行签到请求 (支持重试)
function performCheckin(retryCount = 0) {
    const params = buildParams();
    const url = buildURL(params);
    const headers = buildHeaders();
    const body = "event=checkin";
    
    const request = {
        url: url,
        method: "POST",
        headers: headers,
        body: body
    };
    
    console.log(`🚗 开始蔚来签到... (尝试 ${retryCount + 1}/${CONFIG.maxRetries + 1})`);
    console.log(`📡 请求URL: ${url}`);
    
    $httpClient.post(request, (error, response, data) => {
        if (error) {
            console.log(`❌ 网络请求失败 (尝试 ${retryCount + 1}):`, error);
            
            // 重试逻辑
            if (retryCount < CONFIG.maxRetries) {
                console.log(`⏳ ${CONFIG.retryDelay/1000}秒后重试...`);
                setTimeout(() => {
                    performCheckin(retryCount + 1);
                }, CONFIG.retryDelay);
                return;
            } else {
                console.log("❌ 达到最大重试次数，签到失败");
                $notification.post("蔚来签到", "网络错误 🌐", `请求失败: ${error}`);
                $done();
                return;
            }
        }
        
        console.log(`📊 响应状态码: ${response.status}`);
        console.log(`📄 响应数据长度: ${data ? data.length : 0} 字节`);
        
        const result = handleResponse(response, data);
        
        if (!result.success && retryCount < CONFIG.maxRetries) {
            console.log(`⏳ ${CONFIG.retryDelay/1000}秒后重试...`);
            setTimeout(() => {
                performCheckin(retryCount + 1);
            }, CONFIG.retryDelay);
        } else {
            $done();
        }
    });
}

// ==================== 主函数 ====================

// 脚本入口
function main() {
    console.log("🔄 蔚来自动签到脚本启动");
    console.log(`📅 当前时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`🔧 脚本版本: v1.2.0`);
    console.log(`🌐 请求域名: ${CONFIG.baseURL}`);
    
    // 检查配置
    if (!CONFIG.authorization || CONFIG.authorization.includes("请替换")) {
        console.log("⚠️ 警告: 请先配置正确的authorization token");
        $notification.post("蔚来签到", "配置错误 ⚙️", "请先设置正确的token");
        $done();
        return;
    }
    
    // 开始签到
    performCheckin();
}

// 执行脚本
main();