// src/stores/user.js
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'

// 从 localStorage 获取 token（辅助函数）
function getSavedToken() {
    return localStorage.getItem('userToken')
}

// 从 localStorage 获取用户信息（辅助函数）
function getSavedUserInfo() {
    const userInfoStr = localStorage.getItem('userInfo')
    if (userInfoStr) {
        try {
            return JSON.parse(userInfoStr)
        } catch (e) {
            console.error('解析用户信息失败', e)
            return null
        }
    }
    return null
}

export const useUserStore = defineStore('user', () => {
    // 响应式数据
    const token = ref(getSavedToken())
    const userInfo = ref(getSavedUserInfo())
    const isLoading = ref(false)

    // 计算属性：是否已登录
    const isLoggedIn = computed(() => !!token.value)

    // 登录函数
    async function login(email, password) {
        isLoading.value = true
        
        try {
            // 使用URL编码的表单格式发送数据
            const params = new URLSearchParams()
            params.append('email', email)
            params.append('password', password)

            const response = await fetch('http://luren.online:2345/proxy/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params
            })

            const data = await response.json()

            if (response.ok && data.code === 200) {
                // 登录成功，分别保存token和用户信息
                const userToken = data.data.token
                const userInformation = {
                    email: data.data.email || email,
                    name: data.data.name,
                    imgUrl: data.data.imgUrl,
                    grade: data.data.grade,
                    isEnable: data.data.isEnable
                }
                
                console.log('登录成功，准备更新状态:', { userToken, userInformation })
                
                // 更新状态
                token.value = userToken
                userInfo.value = userInformation

                // 保存到 localStorage
                localStorage.setItem('userToken', userToken)
                localStorage.setItem('userInfo', JSON.stringify(userInformation))
                
                console.log('状态更新完成:', { 
                    token: token.value, 
                    userInfo: userInfo.value,
                    localStorage: {
                        userToken: localStorage.getItem('userToken'),
                        userInfo: localStorage.getItem('userInfo')
                    }
                })
                
                ElMessage.success('登录成功！')
                return { success: true, data: data.data }
            } else {
                throw new Error(data.message || '登录失败')
            }
        } catch (error) {
            console.error('登录错误:', error)
            ElMessage.error('登录失败: ' + error.message)
            return { success: false, error: error.message }
        } finally {
            isLoading.value = false
        }
    }

    // 登出函数
    function logout() {
        clearUserInfo()
        ElMessage.success('已退出登录')
    }

    // 更新用户信息
    function setUserInfo(data) {
        const userToken = data.token
        const userInformation = {
            email: data.email,
            name: data.name,
            imgUrl: data.imgUrl,
            grade: data.grade,
            isEnable: data.isEnable
        }

        // 更新状态
        token.value = userToken
        userInfo.value = userInformation

        // 保存到 localStorage
        localStorage.setItem('userToken', userToken)
        localStorage.setItem('userInfo', JSON.stringify(userInformation))
    }

    // 清除用户信息
    function clearUserInfo() {
        token.value = null
        userInfo.value = null
        localStorage.removeItem('userToken')
        localStorage.removeItem('userInfo')
    }

    return {
        token,
        userInfo,
        isLoggedIn,
        isLoading,
        login,
        logout,
        setUserInfo,
        clearUserInfo
    }
})
