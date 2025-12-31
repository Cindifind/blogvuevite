// src/composables/useAuth.js
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

/**
 * Vue 3 Composition API 风格的 Auth Composable
 * 提供登录、登出、状态管理等功能
 * 使用方式：const { isLoggedIn, login, logout, userInfo, token } = useAuth()
 */

// ✅ 对外暴露一个统一的 useAuth() 函数
export function useAuth() {
    // 获取路由实例
    const router = useRouter()

    // 使用用户 store
    const userStore = useUserStore()

    // 计算属性：是否已登录
    const isLoggedIn = computed(() => userStore.isLoggedIn)
    
    // 计算属性：用户信息
    const userInfo = computed(() => userStore.userInfo)
    
    // 计算属性：token
    const token = computed(() => userStore.token)
    
    // 计算属性：加载状态
    const isLoading = computed(() => userStore.isLoading)

    // 🔐 登录函数
    const login = async (email, password) => {
        try {
            // 使用用户store的登录方法
            const result = await userStore.login(email, password)
            
            if (result.success) {
                // 登录成功，跳转到首页
                router.push('/')
                return { success: true, data: result.data }
            } else {
                return { success: false, error: result.error }
            }
        } catch (error) {
            console.error('登录过程中发生错误:', error)
            ElMessage.error('登录过程中发生错误')
            return { success: false, error: error.message }
        }
    }

    // 🚪 退出登录
    const logout = () => {
        userStore.logout()
    }

    // ✅ 可以继续添加：注册、发送验证码、重置密码等方法...

    // 返回状态与方法
    return {
        token,                          // 当前 token（计算属性）
        userInfo,                       // 当前用户信息（计算属性）
        isLoggedIn,                     // 是否已登录（计算属性）
        isLoading,                      // 加载状态（计算属性）
        login,                          // 登录方法
        logout,                         // 退出登录方法
    }
}
