/**
 * 图标工具函数
 * 提供多种方式获取网站favicon和图标
 */

/**
 * 获取网站favicon的多种尝试方式
 * @param {string} url - 网站URL
 * @returns {Array<string>} 可能的favicon URL数组
 */
export const getFaviconUrls = (url) => {
  if (!url) return ['/default-icon.svg']
  
  try {
    const urlObj = new URL(url)
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`
    
    return [
      // 1. 使用Google的favicon服务（最可靠）
      `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`,
      
      // 2. 使用iconhorse服务
      `https://icon.horse/icon/${urlObj.hostname}`,
      
      // 3. 标准favicon.ico路径
      `${baseUrl}/favicon.ico`,
      
      // 4. 使用favicon.io服务
      `https://favicons.githubusercontent.com/${urlObj.hostname}`,
      
      // 5. 备用方案 - 项目默认图标
      '/default-icon.svg'
    ]
  } catch (error) {
    console.warn('解析URL失败:', error)
    return ['/default-icon.svg']
  }
}

/**
 * 智能获取网站图标
 * 按优先级尝试多个图标源，返回第一个可用的
 * @param {string} url - 网站URL
 * @returns {Promise<string>} 可用的图标URL
 */
export const getSmartFavicon = async (url) => {
  const faviconUrls = getFaviconUrls(url)
  
  for (const faviconUrl of faviconUrls) {
    try {
      const isAvailable = await checkImageAvailability(faviconUrl)
      if (isAvailable) {
        return faviconUrl
      }
    } catch (error) {
      console.warn(`图标检查失败: ${faviconUrl}`, error)
      continue
    }
  }
  
  // 如果所有都失败，返回默认图标
  return '/default-icon.svg'
}

/**
 * 检查图片是否可用
 * @param {string} imageUrl - 图片URL
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<boolean>} 是否可用
 */
export const checkImageAvailability = (imageUrl, timeout = 5000) => {
  return new Promise((resolve) => {
    const img = new Image()
    let isResolved = false
    
    // 设置超时
    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        console.warn(`图标加载超时: ${imageUrl}`)
        resolve(false)
      }
    }, timeout)
    
    img.onload = () => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timer)
        console.log(`图标加载成功: ${imageUrl}`)
        resolve(true)
      }
    }
    
    img.onerror = () => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timer)
        console.warn(`图标加载失败: ${imageUrl}`)
        resolve(false)
      }
    }
    
    // 开始加载图片
    img.src = imageUrl
  })
}

/**
 * 图标缓存管理器
 */
class IconCache {
  constructor() {
    this.cache = new Map()
    this.maxSize = 100 // 最大缓存数量
  }
  
  /**
   * 获取缓存的图标URL
   * @param {string} domain - 域名
   * @returns {string|null} 缓存的图标URL
   */
  get(domain) {
    return this.cache.get(domain) || null
  }
  
  /**
   * 设置图标URL到缓存
   * @param {string} domain - 域名
   * @param {string} iconUrl - 图标URL
   */
  set(domain, iconUrl) {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(domain, iconUrl)
  }
  
  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear()
  }
}

// 创建全局图标缓存实例
const iconCache = new IconCache()

/**
 * 带缓存的智能图标获取
 * @param {string} url - 网站URL
 * @returns {Promise<string>} 图标URL
 */
export const getCachedFavicon = async (url) => {
  if (!url) return '/vite.svg'
  
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    
    // 检查缓存
    const cachedIcon = iconCache.get(domain)
    if (cachedIcon) {
      return cachedIcon
    }
    
    // 获取新图标
    const iconUrl = await getSmartFavicon(url)
    
    // 缓存结果
    iconCache.set(domain, iconUrl)
    
    return iconUrl
  } catch (error) {
    console.warn('获取图标失败:', error)
    return '/default-icon.svg' // 默认图标
  }
}

/**
 * 预加载图标
 * @param {Array<string>} urls - URL数组
 * @returns {Promise<Map<string, string>>} 域名到图标URL的映射
 */
export const preloadIcons = async (urls) => {
  const iconMap = new Map()
  
  const promises = urls.map(async (url) => {
    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname
      const iconUrl = await getCachedFavicon(url)
      iconMap.set(domain, iconUrl)
    } catch (error) {
      console.warn(`预加载图标失败: ${url}`, error)
    }
  })
  
  await Promise.allSettled(promises)
  return iconMap
}

/**
 * 获取高质量图标
 * 尝试获取更大尺寸的图标
 * @param {string} url - 网站URL
 * @param {number} size - 期望的图标尺寸
 * @returns {string} 图标URL
 */
export const getHighQualityFavicon = (url, size = 64) => {
  if (!url) return '/vite.svg'
  
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    
    // 使用Google的favicon服务获取指定尺寸的图标
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
  } catch (error) {
    console.warn('获取高质量图标失败:', error)
    return '/vite.svg'
  }
}

/**
 * 图标工具类
 */
export class IconUtils {
  /**
   * 批量获取图标
   * @param {Array<object>} tools - 工具列表
   * @returns {Promise<Array<object>>} 带图标的工具列表
   */
  static async batchGetIcons(tools) {
    const promises = tools.map(async (tool) => {
      const iconUrl = await getCachedFavicon(tool.url)
      return {
        ...tool,
        iconUrl
      }
    })
    
    return await Promise.allSettled(promises).then(results => 
      results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
    )
  }
  
  /**
   * 清理图标缓存
   */
  static clearCache() {
    iconCache.clear()
  }
  
  /**
   * 获取缓存统计信息
   * @returns {object} 缓存统计
   */
  static getCacheStats() {
    return {
      size: iconCache.cache.size,
      maxSize: iconCache.maxSize,
      domains: Array.from(iconCache.cache.keys())
    }
  }
}

// 默认导出
export default {
  getFaviconUrls,
  getSmartFavicon,
  getCachedFavicon,
  getHighQualityFavicon,
  preloadIcons,
  checkImageAvailability,
  IconUtils
}