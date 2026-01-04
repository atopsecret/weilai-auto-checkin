/*
 * 蔚来APP全自动签到脚本 for Surge (融合版)
 * 
 * 功能特性:
 * - 自动抓取并保存Authorization token
 * - 自动签到蔚来APP
 * - Token过期自动提醒更新
 * - 显示连续签到天数和累计天数
 * - 支持Surge定时任务
 * - 签到结果通知
 * - 错误处理和重试机制
 * 
 * 使用方法:
 * 1. 在Surge中添加请求拦截和定时任务规则
 * 2. 在蔚来APP中进行任意操作（会自动抓取token）
 * 3. 享受全自动签到
 * 
 * 作者: GitHub Community
 * 版本: v2.0.2
 * 更新时间: 2026-01-04
 * 仓库地址: https://github.com/yourusername/weilai-auto-checkin
 */

// ==================== 配置区域 ====================
const CONFIG = {
    // 基础URL - 蔚来签到接口地址
    baseURL: "https://gateway-front-external.nio.com",
    
    // APP信息
    appId: "10086",
    
    // User-Agent - 模拟蔚来APP的webview
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NIOAppCN/5.48.5 (com.do1.WeiLaiApp; build:2549; OS:iOS) webview/lg _dsbridge",
    
    // 重试配置
    maxRetries: 3,
    retryDelay: 2000, // 重试间隔(毫秒)
    
    // Token管理配置
    tokenStorageKey: "weilai_auth_token",
    lastUpdateKey: "weilai_token_last_update",
    tokenValidDays: 30,
    
    // 拦截配置
    targetDomains: [
        "gateway-front-external.nio.com",
        "app.nio.com",
        "api.nio.com"
    ],
    
    targetPaths: [
        "/checkin",
        "/award",
        "/user",
        "/profile",
        "/api"
    ]
};

// ==================== Token管理模块 ====================

// 检查URL是否需要拦截
function shouldInterceptRequest(url) {
    try {
        const urlObj = new URL(url);
        
        // 检查域名
        const domainMatch = CONFIG.targetDomains.some(domain => 
            urlObj.hostname.includes(domain)
        );
        
        if (!domainMatch) return false;
        
        // 检查路径
        const pathMatch = CONFIG.targetPaths.some(path => 
            urlObj.pathname.includes(path)
        );
        
        return pathMatch;
    } catch (e) {
        console.log("❌ URL解析失败:", e);
        return false;
    }
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
    
    try {
        // 保存token
        $persistentStore.write(token, CONFIG.tokenStorageKey);
        
        // 保存更新时间
        $persistentStore.write(currentTime.toString(), CONFIG.lastUpdateKey);
        
        console.log("✅ Token已自动保存");
        console.log(`🔑 Token: ${token.substring(0, 20)}...`);
        console.log(`📅 保存时间: ${new Date(currentTime).toLocaleString('zh-CN')}`);
        
        return true;
    } catch (e) {
        console.log("❌ Token保存失败:", e);
        return false;
    }
}

// 获取已保存的token
function getSavedToken() {
    try {
        const token = $persistentStore.read(CONFIG.tokenStorageKey);
        const lastUpdate = $persistentStore.read(CONFIG.lastUpdateKey);
        
        if (!token || !lastUpdate) return null;
        
        const lastUpdateTime = parseInt(lastUpdate);
        const isExpired = isTokenExpired(lastUpdateTime);
        
        return {
            token: token,
            lastUpdate: lastUpdateTime,
            isExpired: isExpired
        };
    } catch (e) {
        console.log("❌ Token读取失败:", e);
        return null;
    }
}

// 检查token是否过期
function isTokenExpired(lastUpdate) {
    const now = Date.now();
    const expireTime = lastUpdate + (CONFIG.tokenValidDays * 24 * 60 * 60 * 1000);
    return now > expireTime;
}

// 获取有效的token
function getValidToken() {
    const tokenInfo = getSavedToken();
    
    if (!tokenInfo) {
        console.log("❌ 未找到保存的token");
        return null;
    }
    
    if (tokenInfo.isExpired) {
        console.log("⚠️ Token已过期，需要重新抓取");
        $notification.post("蔚来签到", "Token已过期 ⏰", "请在蔚来APP中进行操作以更新token");
        return null;
    }
    
    console.log("✅ 获取到有效token");
    const remainingDays = Math.ceil((tokenInfo.lastUpdate + CONFIG.tokenValidDays * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000));
    console.log(`⏰ Token剩余有效期: ${remainingDays} 天`);
    
    return tokenInfo.token;
}

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
        const message = savedTokenInfo ? "Token已自动更新" : "Token已自动获取";
        $notification.post("蔚来Token", message + " 🔑", "签到脚本将自动使用新token");
    }
}

// ==================== 工具函数 ====================

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

// ==================== 签到功能模块 ====================

// 生成请求参数
function buildParams() {
    const timestamp = Date.now();
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
function buildHeaders(token) {
    return {
        "authority": "gateway-front-external.nio.com",
        "content-type": "application/x-www-form-urlencoded",
        "accept": "application/json, text/plain, */*",
        "authorization": token,
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

// 从响应数据中提取签到统计信息
function extractCheckinStats(result) {
    const data = result.data || {};
    const stats = data.stats || {};
    const awardInfo = data.award_info || {};
    
    // 打印原始数据结构用于调试
    console.log("📋 原始响应数据:", JSON.stringify(result, null, 2));
    
    // 支持多种字段名，兼容不同API版本和响应结构
    const continuousDays = stats.continuous_checkin_days || 
                           stats.continuousDays || 
                           stats.consecutive_days ||
                           data.continuous_checkin_days ||
                           data.continuousDays ||
                           data.consecutive_days ||
                           awardInfo.continuous_days ||
                           awardInfo.continuous_checkin_days ||
                           0;
                           
    const accumulateDays = stats.accumulate_days || 
                           stats.accumulateDays || 
                           stats.total_days ||
                           data.accumulate_days ||
                           data.accumulateDays ||
                           data.total_days ||
                           awardInfo.total_days ||
                           awardInfo.accumulate_days ||
                           0;
    
    const checkinTime = stats.checkin_time || data.checkin_time || '';
    const tip = data.tip || "签到完成";
    
    return { continuousDays, accumulateDays, checkinTime, tip };
}

// 处理签到响应
function handleResponse(response, data, token, callback) {
    try {
        const result = JSON.parse(data);
        
        // 提取统计信息（无论哪种响应都尝试提取）
        const { continuousDays, accumulateDays, checkinTime, tip } = extractCheckinStats(result);
        
        // 检查签到结果
        if (response.status === 200 && result.result_code === 'success') {
            const checkinTimeStr = checkinTime ? formatDateTime(checkinTime) : '';
            
            console.log("✅ 签到成功!");
            if (checkinTimeStr) console.log(`📅 签到时间: ${checkinTimeStr}`);
            
            // 如果累计天数为0，说明签到成功响应中没有统计信息，需要再请求一次获取
            if (accumulateDays === 0) {
                console.log("📊 签到成功响应中无统计信息，正在获取...");
                fetchCheckinStats(token, tip, callback);
                return { success: true, message: tip, needFetchStats: true };
            }
            
            console.log(`🔥 连续签到: ${continuousDays} 天`);
            console.log(`📊 累计签到: ${accumulateDays} 天`);
            
            let message = tip;
            if (continuousDays > 0 || accumulateDays > 0) {
                message = `${tip}\n🔥 连续签到: ${continuousDays} 天\n📊 累计签到: ${accumulateDays} 天`;
            }
            $notification.post("蔚来签到", "签到成功 🎉", message);
            
            if (callback) callback();
            return { success: true, message: tip };
            
        } else if (result.data?.checked_in === true) {
            console.log("ℹ️ 今日已签到");
            console.log(`🔥 连续签到: ${continuousDays} 天`);
            console.log(`📊 累计签到: ${accumulateDays} 天`);
            
            let message = tip;
            if (continuousDays > 0 || accumulateDays > 0) {
                message = `${tip}\n🔥 连续签到: ${continuousDays} 天\n📊 累计签到: ${accumulateDays} 天`;
            }
            $notification.post("蔚来签到", "今日已签到 ✅", message);
            if (callback) callback();
            return { success: true, message: tip };
            
        } else {
            const errorMsg = result.message || result.error || "签到失败";
            console.log("❌ 签到失败:", result);
            
            $notification.post("蔚来签到", "签到失败 ❌", errorMsg);
            if (callback) callback();
            return { success: false, message: errorMsg };
        }
    } catch (e) {
        console.log("❌ 解析响应失败:", e);
        console.log("📄 原始响应:", data);
        
        $notification.post("蔚来签到", "解析失败 ⚠️", "响应格式异常");
        if (callback) callback();
        return { success: false, message: "响应解析异常" };
    }
}

// 签到成功后获取统计信息
function fetchCheckinStats(token, tip, callback) {
    const params = buildParams();
    const url = buildURL(params);
    const headers = buildHeaders(token);
    const body = "event=checkin";
    
    const request = {
        url: url,
        method: "POST",
        headers: headers,
        body: body
    };
    
    console.log("📊 正在获取签到统计信息...");
    
    $httpClient.post(request, (error, response, data) => {
        if (error) {
            console.log("⚠️ 获取统计信息失败:", error);
            $notification.post("蔚来签到", "签到成功 🎉", tip);
            if (callback) callback();
            return;
        }
        
        try {
            const result = JSON.parse(data);
            const { continuousDays, accumulateDays } = extractCheckinStats(result);
            
            console.log(`🔥 连续签到: ${continuousDays} 天`);
            console.log(`📊 累计签到: ${accumulateDays} 天`);
            
            let message = tip;
            if (continuousDays > 0 || accumulateDays > 0) {
                message = `${tip}\n🔥 连续签到: ${continuousDays} 天\n📊 累计签到: ${accumulateDays} 天`;
            }
            $notification.post("蔚来签到", "签到成功 🎉", message);
        } catch (e) {
            console.log("⚠️ 解析统计信息失败:", e);
            $notification.post("蔚来签到", "签到成功 🎉", tip);
        }
        
        if (callback) callback();
    });
}

// 执行签到请求 (支持重试)
function performCheckin(token, retryCount = 0) {
    const params = buildParams();
    const url = buildURL(params);
    const headers = buildHeaders(token);
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
                    performCheckin(token, retryCount + 1);
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
        
        const result = handleResponse(response, data, token, () => {
            $done();
        });
        
        // 如果需要获取统计信息，handleResponse 会自己处理 $done()
        if (result.needFetchStats) {
            return;
        }
        
        if (!result.success && retryCount < CONFIG.maxRetries) {
            console.log(`⏳ ${CONFIG.retryDelay/1000}秒后重试...`);
            setTimeout(() => {
                performCheckin(token, retryCount + 1);
            }, CONFIG.retryDelay);
        } else {
            $done();
        }
    });
}

// ==================== 主函数 ====================

// 脚本入口
function main() {
    // 如果是HTTP请求拦截模式
    if (typeof $request !== 'undefined' && $request) {
        console.log("🎯 Token拦截模式启动");
        handleTokenCapture($request);
        $done({});
        return;
    }
    
    // 如果是签到模式
    console.log("🔄 蔚来全自动签到脚本启动");
    console.log(`📅 当前时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`🔧 脚本版本: v2.0.2 (融合版)`);
    console.log(`🌐 请求域名: ${CONFIG.baseURL}`);
    
    // 获取有效token
    const token = getValidToken();
    if (!token) {
        console.log("❌ 无法获取有效token，请在蔚来APP中进行操作");
        $notification.post("蔚来签到", "Token获取失败 🔑", "请打开蔚来APP进行任意操作以自动获取token");
        $done();
        return;
    }
    
    console.log("✅ Token验证通过，开始签到");
    
    // 开始签到
    performCheckin(token);
}

// 执行脚本
main();