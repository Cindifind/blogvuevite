import {createRouter, createWebHistory} from 'vue-router'

// 导入页面组件
import IndexPage from '../views/index.vue'

// 定义路由规则
const routes = [
    {
        path: '/',
        name: 'Home',
        component: IndexPage
    },
    // 登录页面路由
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/login.vue')
    },
    {
      path: '/blog',
      name: 'Blog',
      // 懒加载组件
      component: () => import('../views/blog.vue')
    },
    // 博客文章详情路由
    {
      path: '/blog/article/:id',
      name: 'BlogArticle',
      component: () => import('../views/blog.vue'),
      props: true
    },

    // H5工具页面路由
    {
      path: '/h5tools',
      name: 'H5Tools',
      component: () => import('../views/h5tools.vue')
    },
    // API管理页面路由
    {
      path: '/api-management',
      name: 'ApiManagement',
      component: () => import('../views/api-management.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    // 语音生成功能页面
    {
      path: '/voice',
      name: 'Voice',
      component: () => import('../views/voice.vue'),
      meta: { requiresAuth: true }
    },
    {
        path: '/music',
        name: '/Music',
        component: () => import('../views/music.vue'),
        meta: { requiresAuth: true }
    }
    // 图片管理页面路由
    // // 留言页面路由
    // {
    //   path: '/message',
    //   name: 'Message',
    //   component: () => import('../views/message.vue')
    // },
    // // API页面路由
    // // 关于页面路由
    // {
    //   path: '/about',
    //   name: 'About',
    //   component: () => import('../views/about.vue')
    // },
    // // 404页面路由
    // {
    //   path: '/:pathMatch(.*)*',
    //   name: 'NotFound',
    //   component: () => import('../views/404.vue')
    // }
]

// 创建路由器实例
const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由导航守卫 - 用于保护需要登录的路由
router.beforeEach((to, from, next) => {
    // 检查是否需要登录的路由
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);
    const isLoggedIn = !!localStorage.getItem('userToken');
    
    // 获取用户信息
    let userInfo = null;
    try {
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
            userInfo = JSON.parse(userInfoStr);
        }
    } catch (error) {
        console.error('解析用户信息失败:', error);
    }
    
    const isAdmin = isLoggedIn && userInfo?.grade === 3;

    if (requiresAuth && !isLoggedIn) {
        // 如果需要登录但用户未登录，重定向到登录页
        next('/login');
    } else if (requiresAdmin && !isAdmin) {
        // 如果需要管理员权限但用户不是管理员，重定向到首页
        next('/');
    } else {
        // 允许访问
        next();
    }
})

export default router