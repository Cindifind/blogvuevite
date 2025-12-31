// main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 导入项目本地的 CSS 文件
import './assets/css/index.css'    // 主要样式
import './assets/css/weather.css'  // 天气组件样式

// 创建并挂载 Vue 应用
const app = createApp(App)

// 使用 Pinia
app.use(createPinia())

// 使用 Element Plus
app.use(ElementPlus)

// 使用路由
app.use(router)

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
    console.error('Vue 应用错误:', err, info)
}

// 挂载应用到 DOM
app.mount('#app')
