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
            backendApi = `https://muqingxi.com:2345/proxy/sitemap?urlPath=${encodeURIComponent(fullUrl)}`;
        } else {
            // 普通页面请求 → 调用 /seoPage 接口
            backendApi = `https://muqingxi.com:2345/proxy/seoPage?urlPath=${encodeURIComponent(fullUrl)}`;
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

    // 5. 非爬虫请求：History 路由模式的 SPA Fallback
    // 判断是否为静态资源请求（文件扩展名）
    const isStaticFile = /\.[a-zA-Z0-9]{1,10}$/.test(pathname);

    if (isStaticFile) {
        // 静态资源：直接返回原文件
        return fetch(request);
    }

    // 非静态资源（SPA路由页面）：返回 index.html，交由 Vue Router 处理
    const indexRequest = new Request(new URL('/index.html', url.origin).href, {
        method: 'GET',
        headers: request.headers,
    });

    return fetch(indexRequest).then(response => {
        const newResponse = new Response(response.body, response);
        // 设置 no-cache，确保 SPA 页面始终由前端路由控制
        newResponse.headers.set('Cache-Control', 'no-cache');
        return newResponse;
    }).catch(error => {
        return new Response('Service Unavailable', { status: 503 });
    });
}