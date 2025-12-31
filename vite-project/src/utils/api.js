// API请求工具函数
// 统一处理token认证的API请求

/**
 * 带token认证的fetch请求函数
 * @param {string} url - 请求URL
 * @param {object} options - fetch选项
 * @returns {Promise<Response>} - fetch响应
 */
export const fetchWithToken = async (url, options = {}) => {
  // 获取token
  const token = localStorage.getItem('userToken')

  // 设置默认选项
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    }
  }

  // 如果有token，则添加到请求头
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`
  }

  // 合并选项
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  }

  return fetch(url, mergedOptions)
}

/**
 * 带token认证的axios请求配置
 * @returns {object} - axios请求配置对象
 */
export const getAxiosConfig = () => {
  const token = localStorage.getItem('userToken')
  
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