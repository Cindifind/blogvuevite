// 文件路径: ./edge-functions/_middleware.js

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
 * 判断是否为 Sitemap 请求
 */
function isSitemapRequest(pathname) {
    return pathname === '/sitemap.xml' || pathname === '/sitemap';
}

/**
 * 主请求处理函数
 */
export function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const userAgent = request.headers.get('User-Agent') || '';
    const pathname = url.pathname;

    // 1. 识别爬虫
    if (isBot(userAgent)) {
        // 2. 获取完整 URL（包含协议、域名、路径、查询参数）
        const fullUrl = request.url;

        // 3. 判断请求类型，选择不同的后端接口（都传递 urlPath 参数）
        let backendApi;
        if (isSitemapRequest(pathname)) {
            // Sitemap 请求 → 调用 /sitemap 接口
            backendApi = `https://muqingxi.com:2345/sitemap?urlPath=${encodeURIComponent(fullUrl)}`;
        } else {
            // 普通页面请求 → 调用 /seoPage 接口
            backendApi = `https://muqingxi.com:2345/seoPage?urlPath=${encodeURIComponent(fullUrl)}`;
        }

        // 4. 发起转发请求（内部转发）
        const modifiedRequest = new Request(backendApi, {
            method: 'GET',
            headers: {
                'X-Original-User-Agent': userAgent,
                'X-Original-URL': fullUrl,
                'X-Original-Path': pathname,
            },
        });

        return fetch(modifiedRequest).then(response => {
            const newResponse = new Response(response.body, response);

            // 给爬虫的响应添加缓存头
            if (isSitemapRequest(pathname)) {
                newResponse.headers.set('Cache-Control', 'public, max-age=3600'); // Sitemap 缓存1小时
            } else {
                newResponse.headers.set('Cache-Control', 'public, max-age=600'); // 普通页面缓存10分钟
            }

            return newResponse;
        }).catch(error => {
            return new Response('Bot Service Unavailable', { status: 503 });
        });
    }

    // 5. 非爬虫请求：正常访问原有页面
    return fetch(request);
}