import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 自定义插件，用于添加安全HTTP头部
const securityHeadersPlugin = {
  name: 'security-headers',
  transformIndexHtml(html) {
    // 这里我们不能直接在生产构建中修改HTTP头部
    // 但可以在HTML中添加meta标签作为备选方案
    const metaTag = '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">';
    if (!html.includes(metaTag)) {
      return html.replace('<head>', `<head>${metaTag}`);
    }
    return html;
  }
};

export default defineConfig({
    plugins: [vue(), securityHeadersPlugin],
    server: {
        port: 3000,
        open: true,
        headers: {
            'X-Content-Type-Options': 'nosniff'
        },
        // 配置历史模式路由回退
        historyApiFallback: {
            index: '/index.html'
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        return id.toString().split('node_modules/')[1].split('/')[0].toString();
                    }
                }
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    }
})