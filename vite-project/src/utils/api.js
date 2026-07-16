// API请求工具函数
// 统一处理token认证，支持 code===403 自动刷新token重试
import { useUserStore } from '../stores/user'

/**
 * 带 token 认证的 fetch，遇到 code===403 自动刷新 token 并重试一次
 * 用法与原生 fetch(url, options) 完全一致，返回标准 Response 对象
 */
export const authFetch = async (url, options = {}) => {
  const makeRequest = async () => {
    const token = localStorage.getItem('accessToken')
    const headers = { ...options.headers }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    return fetch(url, { ...options, headers })
  }

  let response = await makeRequest()

  // HTTP 403 直接触发刷新
  if (response.status === 403) {
    return tryRefreshAndRetry(makeRequest)
  }

  // 检查响应体中的 code 是否为 403（后端通过 body 返回）
  try {
    const cloned = response.clone()
    const data = await cloned.json()
    if (data.code === 403) {
      return tryRefreshAndRetry(makeRequest)
    }
  } catch (e) {
    // 非 JSON 响应（如 blob、文本），跳过 body 检查
  }

  return response
}

/** 执行 token 刷新并重试请求 */
async function tryRefreshAndRetry(makeRequest) {
  console.log('检测到 403，尝试刷新 token...')
  const userStore = useUserStore()
  const refreshResult = await userStore.refreshAccessToken()

  if (refreshResult.success) {
    console.log('Token 刷新成功，重试请求')
    return makeRequest()
  }

  // 刷新失败，跳转登录
  setTimeout(() => { window.location.href = '/login' }, 500)
  throw new Error('登录已过期，请重新登录')
}

/** 向后兼容别名 */
export const fetchWithToken = authFetch

/**
 * 带token认证的axios请求配置
 * @returns {object} - axios请求配置对象
 */
export const getAxiosConfig = () => {
  const token = localStorage.getItem('accessToken')
  
  const config = {
    headers: {}
  }

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  return config
}

/**
 * 检查是否需要token认证的路径
 * @param {string} url - 请求URL
 * @returns {boolean} - 是否需要token认证
 */
export const requiresAuth = (url) => {
  return url.includes('/admin') || url.includes('/user')
}
