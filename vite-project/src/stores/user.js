// src/stores/user.js
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import initArgon2, { argon2HashDefault, argon2_hash_with_salt } from '../wasm/argon2_wasm.js'

let wasmInitialized = false
let argon2HashEmail = null
let argon2HashWithSalt = null

async function initWasm() {
    if (wasmInitialized) return true
    try {
        const wasmUrl = new URL('../wasm/argon2_wasm_bg.wasm', import.meta.url)
        await initArgon2(wasmUrl)

        argon2HashEmail = argon2HashDefault
        argon2HashWithSalt = argon2_hash_with_salt
        
        if (typeof argon2HashEmail !== 'function' || typeof argon2HashWithSalt !== 'function') {
            throw new Error('无法从 WASM 模块获取哈希函数')
        }
        
        wasmInitialized = true
        console.log('WASM 模块初始化成功')
        return true
    } catch (error) {
        console.error('WASM 模块初始化失败:', error)
        return false
    }
}

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
            const initialized = await initWasm()
            if (!initialized) {
                throw new Error('WASM 初始化失败')
            }
            
            // 第一步：用 email 计算 hash，然后调用 /getsalt 获取真正的盐值
            const emailHash = argon2HashEmail(email)
            console.log('Email hash:', emailHash)
            
            const getsaltResponse = await fetch(`https://luren.online:2345/proxy/getsalt?email=${encodeURIComponent(email)}&hash=${encodeURIComponent(emailHash)}`)
            const getsaltData = await getsaltResponse.json()
            
            if (!getsaltResponse.ok || getsaltData.code !== 200) {
                throw new Error(getsaltData.message || '获取盐值失败')
            }
            
            const salt = getsaltData.data
            console.log('获取到的盐值:', salt)
            
            // 第二步：用 email + password 和返回的盐值计算密码 hash
            const passwordWithEmail = email + password
            const passwordHash = argon2HashWithSalt(passwordWithEmail, salt)
            console.log('密码 hash:', passwordHash)
            
            // 第三步：用 email 作为用户名，调用 /login 接口
            const params = new URLSearchParams()
            params.append('emailHash', emailHash)
            params.append('password', passwordHash)
            const response = await fetch('http://localhost:8080/login', {
            // const response = await fetch('https://luren.online:2345/proxy/login', {
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
