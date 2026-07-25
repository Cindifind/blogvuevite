// 文件路径: ./edge-functions/_middleware.js
// 或者针对特定路径，如 ./edge-functions/api/[[default]].js

/**
 * 判断 User-Agent 是否为爬虫
 */
function isBot(userAgent) {
    // 如果 User-Agent 为空，也视为爬虫（方便测试）
    if (!userAgent || userAgent.trim() === '') {
        return true;
    }

    const botPatterns = [
        'Googlebot',
        'Bingbot',
        'Baiduspider',
        'YandexBot',
        'DuckDuckBot',
        'GPTBot',
        'ClaudeBot',
        'Bytespider',
        'Slurp',
        'DuckDuckGo',
        'Sogou',
        'Exabot',
        'facebookexternalhit',
        'Facebot',
        'Twitterbot',
        'Applebot',
        'SemrushBot',
        'AhrefsBot',
        'MJ12bot'
    ];

    const ua = userAgent.toLowerCase();
    return botPatterns.some(bot => ua.includes(bot.toLowerCase()));
}

/**
 * 主请求处理函数
 */
export function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const userAgent = request.headers.get('User-Agent') || '';

    // 1. 识别爬虫
    if (isBot(userAgent)) {
        // 2. 构造转发 URL
        // 将原始请求的完整路径和查询字符串作为参数传递给后端
        const originalUrl = url.pathname + url.search;
        const backendUrl = `https://muqingxi.com:2345/proxy/getUrl?url=${encodeURIComponent(originalUrl)}`;

        // 3. 发起转发请求（内部转发，非 302 重定向）
        // 注意：需要确保后端服务支持 CORS 或同源策略，或者省略 Origin 头
        const modifiedRequest = new Request(backendUrl, {
            method: 'GET', // 或 'POST'，根据后端要求
            headers: {
                // 可以传递原始 User-Agent 供后端参考
                'X-Original-User-Agent': userAgent,
                // 可根据需要传递其他头部
            },
        });

        // 使用 fetch 发起内部请求，并将结果返回给客户端
        // 使用 context.waitUntil 可以确保异步任务完成，但这里直接 await 会更稳妥
        // 由于 Edge Function 环境支持 top-level await，但为了兼容性，使用 then
        return fetch(modifiedRequest).then(response => {
            // 可以在这里修改响应的头部，比如添加缓存控制
            const newResponse = new Response(response.body, response);
            // 给爬虫的响应添加明确的缓存头，减少源站压力
            newResponse.headers.set('Cache-Control', 'public, max-age=600'); // 缓存10分钟
            return newResponse;
        }).catch(error => {
            // 如果后端服务不可用，返回友好的错误信息
            return new Response('Bot Service Unavailable', { status: 503 });
        });
    }

    // 4. 非爬虫请求：正常访问原有页面（不处理，EdgeOne 将尝试匹配静态资源或其他路由）
    // 这里返回 undefined 或不做任何处理，让请求继续
    // 注意：如果此函数是 _middleware.js，需要返回 undefined 来继续后续流程
    // 如果是直接作为路由处理函数，则需要返回 fetch(request) 来获取静态资源
    // 由于文档未明确 _middleware 的 next 机制，更稳妥的方式是直接返回 fetch(request)
    return fetch(request);
}