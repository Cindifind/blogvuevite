<script setup>
import {ref, reactive, onMounted, computed, watch, nextTick} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useAuth} from '../composables/useAuth'
import {marked} from 'marked'
import {ElMessage, ElMessageBox} from 'element-plus'
import CommentSection from './CommentSection.vue'
import {authFetch} from '../utils/api'

// 路由相关
const route = useRoute()
const router = useRouter()

// 使用认证状态
const {isLoggedIn, userInfo} = useAuth()

// 计算属性：是否为管理员
const isAdmin = computed(() => {
  return isLoggedIn.value && userInfo.value?.grade === 3
})

// 响应式数据
const loading = ref(false)
const error = ref(null)
const articles = ref([])
const selectedArticle = ref(null)
const markdownContent = ref('') // 存储Markdown内容

// 应用代码高亮（基于 Prism.js，与 music.html 保持一致）
const applyCodeHighlighting = async () => {
  await nextTick()
  const Prism = window.Prism
  if (Prism?.highlightAll) {
    Prism.highlightAll()
  }
}

// 当 Markdown 内容或文章详情变化时，重新高亮代码块
watch(markdownContent, () => {
  applyCodeHighlighting()
})
watch(selectedArticle, () => {
  applyCodeHighlighting()
})

// 配置 marked 在解析阶段集成 Prism.js（适配 v16 API）
try {
  const Prism = typeof window !== 'undefined' ? window.Prism : null
  const escapeHtml = (str) => String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  // 使用 marked v16 的对象签名渲染器
  const renderer = {
    // code 接收对象参数：{ text, lang }
    code({text, lang}) {
      const language = (lang || '').trim().toLowerCase()
      let codeHtml = escapeHtml(text)
      if (Prism?.languages && Prism?.highlight && language) {
        const grammar = Prism.languages[language]
        if (grammar) {
          try {
            codeHtml = Prism.highlight(text, grammar, language)
          } catch (_) { /* ignore */
          }
        }
      }
      const langClass = language ? `language-${language}` : ''
      return `<pre><code class="${langClass}">${codeHtml}</code></pre>`
    }
  }

  // 应用渲染器与高亮回调
  marked.use({renderer})
  marked.setOptions({
    breaks: true,
    gfm: true
  })
} catch (_) {
}
const currentPage = ref(0)
const totalPages = ref(0)
const pageSize = 10

// 添加文章相关
const showAddContainer = ref(false)
const newArticle = reactive({
  title: '',
  description: '',  // 改为description匹配API
  label: '',        // 改为label匹配API
  image: null,
  imagePreview: null,
  mdFile: null,
  mdFileName: ''
})

// 图片管理相关
const showImageContainer = ref(false)
const images = ref([])

// 图片查看模态框相关
const showImageModal = ref(false)
const currentImageName = ref('')
const currentImageUrl = ref('')

// 上传图片相关
const showUploadContainer = ref(false)
const uploadPreviews = ref([])
const uploading = ref(false)

// 清理无效文件相关
const cleaning = ref(false)

// 引用
const imageFileInput = ref(null)
const mdFileInput = ref(null)
const uploadFileInput = ref(null)

// 方法：加载文章列表
const loadArticles = async (page = 0) => {
  loading.value = true
  error.value = null

  try {
    const response = await fetch(`https://muqingxi.com:2345/proxy/page?pageNum=${page}&pageSize=${pageSize}`)

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`)
    }

    const data = await response.json()
    console.log('API响应数据:', data) // 调试用，查看实际响应格式

    // 根据实际API响应格式调整数据处理
    if (data.code === 200 || data.status === 200 || data.success) {
      // 处理不同的响应格式
      const articlesData = data.data?.records || data.articles || data.data || data.list || []
      const total = data.data?.total || data.total || articlesData.length

      articles.value = articlesData.map(article => ({
        ...article,
        // 确保必要字段存在
        timestamp: article.timestamp || article.id || article.createTime || Date.now(),
        title: article.title || '无标题',
        content: article.content || '',
        excerpt: article.excerpt || article.summary || (article.content ? article.content.substring(0, 200) + '...' : '暂无摘要'),
        image: article.image || article.coverImage || article.thumbnail || '',
        labels: article.labels || article.tags || '',
        views: article.views || article.viewCount || 0,
        likes: article.likes || article.likeCount || 0,
        author: article.author || '匿名',
        createTime: article.createTime || article.timestamp || Date.now(),
        mdFile: article.mdFile || article.md || article.markdownFile || '' // 添加mdFile字段映射
      }))

      currentPage.value = page
      totalPages.value = Math.ceil(total / pageSize)

      console.log('处理后的文章数据:', articles.value)
    } else {
      throw new Error(data.message || data.msg || '获取文章失败')
    }
  } catch (err) {
    console.error('加载文章失败:', err)
    error.value = err.message || '加载文章时发生错误'
    // 如果是网络错误，提供更友好的提示
    if (err.message.includes('fetch')) {
      error.value = '无法连接到服务器，请检查网络连接或确保后端服务正在运行'
    }
  } finally {
    loading.value = false
  }
}

// 方法：显示文章详情
const showArticle = (article) => {
  selectedArticle.value = {
    ...article,
    // 确保内容格式化
    content: formatArticleContent(article.content)
  }
  // 更新URL
  router.push(`/blog/article/${article.timestamp}`)
  // 获取并渲染Markdown内容
  loadMarkdownContent(article.mdFile)
  // 渲染完成后应用代码高亮
  applyCodeHighlighting()
}

onMounted(() => {
  applyCodeHighlighting()
})

// 方法：通过ID加载文章
const loadArticleById = async (articleId) => {
  try {
    // 如果文章列表为空，先加载文章列表
    if (articles.value.length === 0) {
      await loadArticles(0)
    }

    // 在文章列表中查找对应的文章
    const article = articles.value.find(a => a.timestamp.toString() === articleId.toString())

    if (article) {
      selectedArticle.value = {
        ...article,
        content: formatArticleContent(article.content)
      }
      loadMarkdownContent(article.mdFile)
    } else {
      // 如果在当前页面没找到，可能需要搜索所有页面
      ElMessage.error('文章不存在或已被删除')
      router.push('/blog')
    }
  } catch (error) {
    console.error('加载文章失败:', error)
    ElMessage.error('加载文章失败')
    router.push('/blog')
  }
}

// 方法：格式化文章内容
const formatArticleContent = (content) => {
  if (!content) return '<p class="no-content">暂无内容</p>'

  // 增强的Markdown格式转换
  let formattedContent = content
      // 处理代码块（必须在其他处理之前）
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')

      // 处理标题
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')

      // 处理引用
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')

      // 处理粗体和斜体
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')

      // 处理链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

      // 处理图片
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        // 如果是相对路径，转换为完整的API路径
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
          src = getImageUrl(src);
        }
        return `<img src="${src}" alt="${alt}" class="article-image" onerror="if(!this.src.includes('default-article-image.jpg')){this.src='/default-article-image.jpg';} this.onerror=null;" />`;
      })

      // 处理无序列表
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')

      // 处理有序列表
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')

      // 处理水平线
      .replace(/^---$/gim, '<hr>')

      // 处理段落和换行
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

  // 包装在段落标签中
  if (formattedContent && !formattedContent.startsWith('<')) {
    formattedContent = '<p>' + formattedContent + '</p>';
  }

  return formattedContent;
}

// 方法：返回文章列表
const backToList = () => {
  selectedArticle.value = null
  markdownContent.value = '' // 清空Markdown内容
  router.push('/blog') // 更新URL到博客列表页
}

// 方法：格式化日期
const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

// 方法：获取图片URL
const getImageUrl = (filename) => {
  if (!filename) {
    return '/default-article-image.jpg'; // 默认封面图片
  }
  return `https://muqingxi.com:2345/proxy/image?filename=${filename}`;
}

// 方法：处理图片加载错误
const handleImageError = (event) => {
  console.warn('图片加载失败:', event.target.src);
  // 检查是否已经是默认图片，避免循环请求
  if (!event.target.src.includes('default-article-image.jpg')) {
    event.target.src = '/default-article-image.jpg'; // 设置默认图片
  }
  event.target.onerror = null; // 防止无限循环
}

// 处理文章内容中的图片
const processArticleImages = (content) => {
  if (!content) return '';

  // 替换Markdown图片语法为HTML img标签
  return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    // 如果是相对路径，转换为完整的API路径
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      src = getImageUrl(src);
    }
    return `<img src="${src}" alt="${alt}" class="article-image" onerror="if(!this.src.includes('default-article-image.jpg')){this.src='/default-article-image.jpg';} this.onerror=null;" />`;
  });
}

// 获取可见的页码
const getVisiblePages = () => {
  const pages = [];
  const maxVisible = 5; // 最多显示5个页码
  const half = Math.floor(maxVisible / 2);

  let start = Math.max(1, currentPage.value + 1 - half);
  let end = Math.min(totalPages.value, start + maxVisible - 1);

  // 调整起始位置
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
}

// 方法：加载Markdown内容
const loadMarkdownContent = async (filename) => {
  console.log('尝试加载Markdown文件:', filename) // 添加调试日志

  if (!filename) {
    console.log('没有提供文件名，显示默认消息')
    markdownContent.value = '<p class="no-content">暂无Markdown内容</p>'
    return
  }

  try {
    const url = `https://muqingxi.com:2345/proxy/md?filename=${encodeURIComponent(filename)}`
    console.log('发送请求到:', url) // 添加调试日志

    const response = await fetch(url)

    if (response.ok) {
      const markdownText = await response.text()
      console.log('成功获取Markdown内容:', markdownText.substring(0, 100) + '...') // 显示前100个字符
      // 使用marked解析Markdown为HTML
      markdownContent.value = marked(markdownText)
    } else {
      console.error('HTTP响应错误:', response.status, response.statusText)
      markdownContent.value = '<p class="error-content">无法加载Markdown内容</p>'
    }
  } catch (err) {
    console.error('加载Markdown内容失败:', err)
    markdownContent.value = '<p class="error-content">加载Markdown内容时发生错误</p>'
  }
}

// 方法：点赞文章
const likeArticle = async (timestamp) => {
  try {
    const response = await authFetch('https://muqingxi.com:2345/proxy/likeArticle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({timestamp})
    })

    if (response.ok) {
      const data = await response.json()
      if (data.status === '200' && selectedArticle.value) {
        selectedArticle.value.likes = (selectedArticle.value.likes || 0) + 1
      }
    }
  } catch (err) {
    console.error('点赞失败:', err)
  }
}

// 管理员功能：切换添加文章容器
const toggleAddArticleContainer = () => {
  showAddContainer.value = !showAddContainer.value
  // 关闭其他容器
  showImageContainer.value = false
  showUploadContainer.value = false
}

// 管理员功能：关闭添加文章容器
const closeAddArticleContainer = () => {
  showAddContainer.value = false
  // 重置表单
  Object.keys(newArticle).forEach(key => {
    if (key === 'imagePreview' || key === 'image' || key === 'mdFile') {
      newArticle[key] = null
    } else {
      newArticle[key] = ''
    }
  })
}

// 管理员功能：处理图片选择
const handleImageSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    newArticle.image = file
    const reader = new FileReader()
    reader.onload = (e) => {
      newArticle.imagePreview = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 管理员功能：移除图片
const removeImage = () => {
  newArticle.image = null
  newArticle.imagePreview = null
  if (imageFileInput.value) {
    imageFileInput.value.value = ''
  }
}

// 管理员功能：处理Markdown文件选择
const handleMdSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    newArticle.mdFile = file
    newArticle.mdFileName = file.name

    // 读取文件内容
    const reader = new FileReader()
    reader.onload = (e) => {
      newArticle.content = e.target.result
    }
    reader.readAsText(file)
  }
}

// 管理员功能：移除Markdown文件
const removeMdFile = () => {
  newArticle.mdFile = null
  newArticle.mdFileName = ''
  if (mdFileInput.value) {
    mdFileInput.value.value = ''
  }
}

// 管理员功能：添加文章
const addArticle = async () => {
  try {
    // 验证必填字段
    if (!newArticle.title || !newArticle.description || !newArticle.label) {
      ElMessage.error('标题、描述和标签都是必填项')
      return
    }

    // 验证图片和MD文件
    if (!newArticle.image || !newArticle.mdFile) {
      ElMessage.error('封面图片和Markdown文件都是必填项')
      return
    }

    const formData = new FormData()
    formData.append('title', newArticle.title)
    formData.append('description', newArticle.description)  // 匹配API参数
    formData.append('label', newArticle.label)  // 匹配API参数
    formData.append('image', newArticle.image)  // 必填参数
    formData.append('md', newArticle.mdFile)  // 匹配API参数

    // 从localStorage获取email
    const userInfoStr = localStorage.getItem('userInfo')
    let email = null

    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr)
        email = userInfo.email
      } catch (e) {
        console.error('解析用户信息失败:', e)
      }
    }

    if (!email) {
      ElMessage.error('未找到用户邮箱信息，请重新登录')
      return
    }
    formData.append('email', email)  // 匹配API参数

    const response = await authFetch('https://muqingxi.com:2345/proxy/upload', {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      const data = await response.json()
      console.log('服务器返回数据:', data) // 调试日志
      if (data.status === '200' || data.message === '文章上传成功') {
        ElMessage.success('文章添加成功')
        closeAddArticleContainer()
        loadArticles(0) // 重新加载文章列表
      } else {
        throw new Error(data.message || '添加文章失败')
      }
    } else {
      throw new Error('添加文章失败')
    }
  } catch (err) {
    console.error('添加文章失败:', err)
    ElMessage.error('添加文章失败: ' + err.message)
  }
}

// 管理员功能：删除文章
const deleteArticle = async (timestamp) => {
  try {
    await ElMessageBox.confirm('确定要删除这篇文章吗？此操作不可恢复。', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await authFetch(`https://muqingxi.com:2345/proxy/delete?timestamp=${timestamp}`, {
      method: 'GET'
    })

    if (response.ok) {
      const data = await response.json()
      console.log('删除文章服务器返回数据:', data) // 调试日志
      if (data.status === '200' || data.message === '文章删除成功') {
        ElMessage.success('文章删除成功')
        loadArticles(currentPage.value) // 重新加载当前页
      } else {
        throw new Error(data.message || '删除文章失败')
      }
    } else {
      throw new Error('删除文章失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除文章失败:', err)
      ElMessage.error('删除文章失败: ' + err.message)
    }
  }
}

// 管理员功能：切换图片管理容器
const toggleImageManagementContainer = async () => {
  showImageContainer.value = !showImageContainer.value
  // 关闭其他容器
  showAddContainer.value = false
  showUploadContainer.value = false
  if (showImageContainer.value) {
    await loadImages()
  }
}

// 管理员功能：关闭图片管理容器
const closeImageManagementContainer = () => {
  showImageContainer.value = false
}

// 管理员功能：加载图片列表
const loadImages = async () => {
  try {
    const response = await authFetch('https://muqingxi.com:2345/proxy/getMdImageList')
    if (response.ok) {
      const data = await response.json()
      if (data.code === 200) {
        // 将路径数组转换为包含filename的对象数组
        images.value = (data.data || []).map(path => ({
          filename: path // 保留完整路径
        }))
      }
    }
  } catch (err) {
    console.error('加载图片失败:', err)
  }
}

// 管理员功能：删除图片
const deleteImage = async (filename) => {
  if (!confirm('确定要删除这张图片吗？')) {
    return
  }

  try {
    // 使用FormData或URLSearchParams发送请求参数
    const formData = new FormData()
    formData.append('mdImageName', filename)

    const response = await authFetch('https://muqingxi.com:2345/proxy/deleteMdImage', {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      const data = await response.json()
      if (data.code === 200) {
        await loadImages() // 重新加载图片列表
        ElMessage.success('图片删除成功')
      } else {
        throw new Error(data.message || '删除图片失败')
      }
    } else {
      throw new Error('删除图片失败')
    }
  } catch (err) {
    console.error('删除图片失败:', err)
    ElMessage.error('删除图片失败: ' + err.message)
  }
}

// 管理员功能：查看图片
const viewImage = (filename) => {
  currentImageName.value = filename
  currentImageUrl.value = `https://muqingxi.com:2345/proxy/image?filename=${filename}`
  showImageModal.value = true
}

// 管理员功能：关闭图片查看模态框
const closeImageModal = () => {
  showImageModal.value = false
  currentImageName.value = ''
  currentImageUrl.value = ''
}

// 管理员功能：切换上传图片容器
const toggleUploadImageContainer = () => {
  showUploadContainer.value = !showUploadContainer.value
  // 关闭其他容器
  showAddContainer.value = false
  showImageContainer.value = false
}

// 管理员功能：关闭上传图片容器
const closeUploadImageContainer = () => {
  showUploadContainer.value = false
  uploadPreviews.value = []
  if (uploadFileInput.value) {
    uploadFileInput.value.value = ''
  }
}

// 管理员功能：处理上传文件选择
const handleUploadSelect = (event) => {
  const files = Array.from(event.target.files)
  uploadPreviews.value = []

  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadPreviews.value.push({
        file,
        url: e.target.result,
        name: file.name
      })
    }
    reader.readAsDataURL(file)
  })
}

// 管理员功能：上传图片
const uploadImages = async () => {
  if (uploadPreviews.value.length === 0) return

  uploading.value = true

  try {
    // 只上传第一个图片文件
    const preview = uploadPreviews.value[0]
    const formData = new FormData()
    formData.append('image', preview.file)

    const response = await authFetch('https://muqingxi.com:2345/proxy/mdImage', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('服务器响应:', response.status, errorText)
      throw new Error(`上传 ${preview.name} 失败: ${response.status} ${errorText}`)
    }

    const result = await response.text()
    console.log('上传成功:', result)

    closeUploadImageContainer()
    ElMessage.success('图片上传成功！')
  } catch (err) {
    console.error('上传图片失败:', err)
    ElMessage.error('上传图片失败: ' + err.message)
  } finally {
    uploading.value = false
  }
}

// 管理员功能：清理无效文件
const cleanInvalidFiles = async () => {
  if (cleaning.value) return

  cleaning.value = true

  try {
    ElMessage.info('开始获取服务列表...')

    // 1. 获取所有服务列表
    const servicesResponse = await authFetch('https://muqingxi.com:2345/cline', {
      method: 'GET'
    })

    if (!servicesResponse.ok) {
      throw new Error(`获取服务列表失败: ${servicesResponse.status}`)
    }

    const services = await servicesResponse.json()
    console.log('获取到的服务列表:', services)

    // 2. 筛选出所有clean服务
    const cleanServices = services.filter(service => service.infName === 'clean')
    console.log('找到的clean服务:', cleanServices)

    if (cleanServices.length === 0) {
      ElMessage.warning('未找到任何clean服务')
      return
    }

    ElMessage.info(`找到 ${cleanServices.length} 个clean服务，开始清理...`)

    // 3. 批量调用清理接口
    let successCount = 0
    let failCount = 0

    for (const service of cleanServices) {
      try {
        const cleanUrl = `${service.address}`
        console.log(`正在清理: ${cleanUrl}`)

        const cleanResponse = await authFetch(cleanUrl, {
          method: 'GET'
        })

        if (cleanResponse.ok) {
          const result = await cleanResponse.text()
          console.log(`清理成功 ${cleanUrl}:`, result)
          successCount++
        } else {
          console.error(`清理失败 ${cleanUrl}:`, cleanResponse.status)
          failCount++
        }
      } catch (err) {
        console.error(`清理异常 ${service.address}:`, err)
        failCount++
      }
    }

    // 4. 显示结果
    if (failCount === 0) {
      ElMessage.success(`清理完成！成功清理 ${successCount} 个服务`)
    } else {
      ElMessage.warning(`清理完成！成功: ${successCount}, 失败: ${failCount}`)
    }

  } catch (err) {
    console.error('清理无效文件失败:', err)
    ElMessage.error('清理无效文件失败: ' + err.message)
  } finally {
    cleaning.value = false
  }
}
// 生命周期：组件挂载时加载文章
onMounted(() => {
  loadArticles(0)

  // 检查是否有文章ID参数
  if (route.params.id) {
    loadArticleById(route.params.id)
  }
})

// 监听路由变化
watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    loadArticleById(newId)
  } else if (!newId && oldId) {
    // 从文章详情页返回列表页
    selectedArticle.value = null
    markdownContent.value = ''
  }
})
</script>

<template>
  <div class="section">
    <div class="fp-tablecell">
      <div class="journal">
        <div class="journal__shell">

          <!-- Loading -->
          <div v-if="loading" class="journal__state">
            <div class="journal__spinner" aria-hidden="true"></div>
            <p class="journal__state-text">正在加载文章…</p>
          </div>

          <!-- Error -->
          <div v-else-if="error" class="journal__state journal__state--error">
            <div class="journal__state-icon" aria-hidden="true">!</div>
            <p class="journal__state-text">{{ error }}</p>
            <el-button type="primary" round @click="loadArticles(0)">重新加载</el-button>
          </div>

          <template v-else>
            <!-- List view -->
            <div v-if="!selectedArticle" class="journal__list">

              <header class="journal__header">
                <div class="journal__header-text">
                  <span class="journal__eyebrow">Writing &amp; Notes</span>
                  <h1 class="journal__title">博客</h1>
                  <p class="journal__subtitle">记录思考、分享见闻</p>
                </div>
              </header>

              <!-- Admin toolbar -->
              <aside v-if="isAdmin" class="journal__admin">
                <span class="journal__admin-label">管理</span>
                <div class="journal__admin-actions">
                  <button type="button" class="journal__admin-btn journal__admin-btn--add"
                          @click="toggleAddArticleContainer">
                    添加文章
                  </button>
                  <button type="button" class="journal__admin-btn" @click="toggleImageManagementContainer">
                    图片管理
                  </button>
                  <button type="button" class="journal__admin-btn" @click="toggleUploadImageContainer">
                    上传图片
                  </button>
                  <button type="button" class="journal__admin-btn journal__admin-btn--muted" :disabled="cleaning"
                          @click="cleanInvalidFiles">
                    {{ cleaning ? '清理中…' : '清理无效文件' }}
                  </button>
                </div>
              </aside>

              <!-- Empty list -->
              <div v-if="articles.length === 0" class="journal__empty">
                <p>暂无文章</p>
              </div>

              <!-- Article grid -->
              <div v-else class="journal__grid">
                <article
                    v-for="article in articles"
                    :key="article.timestamp"
                    class="journal__card"
                    @click="showArticle(article)"
                >
                  <div class="journal__card-cover">
                    <img
                        v-if="article.image && article.image.trim()"
                        :src="getImageUrl(article.image)"
                        :alt="article.title"
                        class="journal__card-img"
                        @error="handleImageError"
                    />
                    <div v-else class="journal__card-placeholder">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                           aria-hidden="true">
                        <path
                            d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                    </div>
                    <span v-if="article.label" class="journal__card-tag">{{ article.label }}</span>
                  </div>

                  <div class="journal__card-body">
                    <time class="journal__card-date">{{ formatDate(article.timestamp) }}</time>
                    <h2 class="journal__card-title">{{ article.title }}</h2>
                    <p v-if="article.description" class="journal__card-desc">{{ article.description }}</p>

                    <footer class="journal__card-footer">
                      <div class="journal__stats">
                    <span class="journal__stat" title="浏览">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                           aria-hidden="true">
                        <path
                            d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                      {{ article.views || 0 }}
                    </span>
                        <span class="journal__stat" title="点赞">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                           aria-hidden="true">
                        <path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      {{ article.likes || 0 }}
                    </span>
                        <span class="journal__stat" title="评论">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                           aria-hidden="true">
                        <path
                            d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .55.45 1 1 1 .17 0 .33-.04.48-.11l4.14-2.07c.33-.16.58-.48.58-.86V16h3c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12H7v-2h6v2zm4-3H7V9h10v2zm0-3H7V6h10v2z"/>
                      </svg>
                      {{ article.comment || 0 }}
                    </span>
                      </div>
                      <button
                          v-if="isAdmin"
                          type="button"
                          class="journal__delete"
                          @click.stop="deleteArticle(article.timestamp)"
                      >
                        删除
                      </button>
                    </footer>
                  </div>
                </article>
              </div>

              <!-- Pagination -->
              <nav v-if="totalPages > 1" class="journal__pagination">
                <el-pagination
                    background
                    layout="prev, pager, next"
                    :total="totalPages * pageSize"
                    :page-size="pageSize"
                    :current-page="currentPage + 1"
                    @current-change="(page) => loadArticles(page - 1)"
                />
              </nav>
              <p v-if="totalPages > 0" class="journal__page-info">
                第 {{ currentPage + 1 }} / {{ totalPages }} 页
              </p>
            </div>

            <!-- Detail view -->
            <article v-else class="journal__detail">
              <button type="button" class="journal__back" @click="backToList">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                返回列表
              </button>

              <header class="journal__detail-header">
                <div class="journal__detail-meta">
                  <time>{{ formatDate(selectedArticle.timestamp) }}</time>
                  <span v-if="selectedArticle.labels" class="journal__detail-tag">{{ selectedArticle.labels }}</span>
                </div>
                <h1 class="journal__detail-title">{{ selectedArticle.title }}</h1>
              </header>

              <div class="journal__prose">
                <div v-if="markdownContent" class="journal__markdown" v-html="markdownContent"></div>
                <div v-else v-html="selectedArticle.content"></div>
              </div>

              <div class="journal__detail-actions">
                <button type="button" class="journal__like" @click="likeArticle(selectedArticle.timestamp)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  点赞 · {{ selectedArticle.likes || 0 }}
                </button>
              </div>

              <CommentSection :articleId="selectedArticle.timestamp" v-if="selectedArticle" class="journal__comments"/>
            </article>
          </template>

          <!-- Dialog: add article -->
          <el-dialog
              v-model="showAddContainer"
              title="添加新文章"
              width="600px"
              :close-on-click-modal="false"
              destroy-on-close
              class="journal__dialog"
          >
            <el-form :model="newArticle" label-position="top" @submit.prevent="addArticle">
              <el-form-item label="文章标题" required>
                <el-input v-model="newArticle.title" placeholder="请输入标题"/>
              </el-form-item>
              <el-form-item label="文章描述" required>
                <el-input v-model="newArticle.description" type="textarea" :rows="3" placeholder="请输入描述"/>
              </el-form-item>
              <el-form-item label="文章标签" required>
                <el-input v-model="newArticle.label" placeholder="请输入标签"/>
              </el-form-item>
              <el-form-item label="封面图片" required>
                <input type="file" accept="image/*" @change="handleImageSelect" class="journal__file-input"/>
                <div v-if="newArticle.imagePreview" class="journal__preview-wrap">
                  <img :src="newArticle.imagePreview" alt="预览" class="journal__preview-img"/>
                </div>
              </el-form-item>
              <el-form-item label="Markdown 文件" required>
                <input type="file" accept=".md" @change="handleMdSelect" class="journal__file-input"/>
              </el-form-item>
              <div class="journal__dialog-actions">
                <el-button @click="closeAddArticleContainer">取消</el-button>
                <el-button type="primary" native-type="submit">发布文章</el-button>
              </div>
            </el-form>
          </el-dialog>

          <!-- Dialog: image management -->
          <el-dialog
              v-model="showImageContainer"
              title="图片管理"
              width="800px"
              :close-on-click-modal="false"
              destroy-on-close
              class="journal__dialog"
          >
            <div v-if="images.length === 0" class="journal__dialog-empty">暂无图片</div>
            <div v-else class="journal__image-list">
              <div v-for="image in images" :key="image.filename" class="journal__image-row">
                <span class="journal__image-name" @click="viewImage(image.filename)">{{ image.filename }}</span>
                <el-button size="small" type="danger" @click="deleteImage(image.filename)">删除</el-button>
              </div>
            </div>
          </el-dialog>

          <!-- Dialog: image preview -->
          <el-dialog
              v-model="showImageModal"
              :title="currentImageName"
              width="90%"
              :close-on-click-modal="true"
              class="journal__dialog journal__dialog--image"
          >
            <div class="journal__image-view">
              <img :src="currentImageUrl" :alt="currentImageName" class="journal__image-full"/>
            </div>
          </el-dialog>

          <!-- Dialog: upload image -->
          <el-dialog
              v-model="showUploadContainer"
              title="上传图片"
              width="600px"
              :close-on-click-modal="false"
              destroy-on-close
              class="journal__dialog"
          >
            <el-form @submit.prevent="uploadImages">
              <el-form-item label="选择图片文件">
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    @change="handleUploadSelect"
                    ref="uploadFileInput"
                    class="journal__file-input"
                />
              </el-form-item>
              <div v-if="uploadPreviews.length" class="journal__upload-grid">
                <div v-for="(p, idx) in uploadPreviews" :key="idx" class="journal__upload-item">
                  <img :src="p.url" :alt="p.name" class="journal__upload-thumb"/>
                  <p class="journal__upload-name">{{ p.name }}</p>
                </div>
              </div>
              <div class="journal__dialog-actions">
                <el-button @click="closeUploadImageContainer">取消</el-button>
                <el-button type="warning" native-type="submit" :disabled="uploadPreviews.length === 0">
                  上传图片
                </el-button>
              </div>
            </el-form>
          </el-dialog>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.journal {
  --j-bg: rgba(255, 255, 255, 0.2);
  --j-surface: rgba(255, 255, 255, 0.25);
  --j-surface-hover: rgba(255, 255, 255, 0.35);
  --j-border: rgba(255, 255, 255, 0.3);
  --j-border-strong: rgba(255, 255, 255, 0.4);
  --j-text: rgba(255, 255, 255, 0.95);
  --j-text-muted: rgba(255, 255, 255, 0.7);
  --j-accent: #ff7edb;
  --j-accent-soft: rgba(255, 126, 219, 0.2);
  --j-teal: #66ccff;
  --j-teal-soft: rgba(102, 204, 255, 0.2);
  --j-danger: #ff6b6b;
  --j-radius: 16px;
  --j-radius-lg: 24px;
  --j-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  --j-font: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  z-index: 2;

  display: flex;
  justify-content: center;
  min-height: calc(100vh - 100px);
  padding: 30px 20px 50px;
  font-family: var(--j-font);
  color: var(--j-text);
  background: transparent;
}

.journal__shell {
  width: 100%;
  max-width: 1180px;
  background: transparent;
  backdrop-filter: unset;
  border: none;
  border-radius: var(--j-radius-lg);
  box-shadow: unset;
  padding: clamp(24px, 5vw, 48px);
  animation: journal-enter 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes journal-enter {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── States ── */
.journal__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 24px;
  text-align: center;
}

.journal__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--j-border-strong);
  border-top-color: var(--j-accent);
  border-radius: 50%;
  animation: journal-spin 0.8s linear infinite;
}

@keyframes journal-spin {
  to {
    transform: rotate(360deg);
  }
}

.journal__state-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(224, 108, 117, 0.15);
  color: var(--j-danger);
  font-size: 1.4rem;
  font-weight: 700;
}

.journal__state-text {
  color: var(--j-text-muted);
  max-width: 420px;
  line-height: 1.6;
}

/* ── List header ── */
.journal__header {
  margin-bottom: 32px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--j-border);
}

.journal__eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--j-accent);
  margin-bottom: 10px;
}

.journal__title {
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin: 0 0 8px;
}

.journal__subtitle {
  color: var(--j-text-muted);
  font-size: 1rem;
  margin: 0;
}

/* ── Admin toolbar ── */
.journal__admin {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  margin-bottom: 28px;
  background: var(--j-surface);
  border: 1px solid var(--j-border);
  border-radius: var(--j-radius);
}

.journal__admin-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--j-teal);
  padding-right: 8px;
  border-right: 1px solid var(--j-border);
}

.journal__admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.journal__admin-btn {
  padding: 7px 14px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--j-text);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--j-border);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}

.journal__admin-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--j-border-strong);
}

.journal__admin-btn--add {
  background: var(--j-teal-soft);
  border-color: rgba(94, 196, 182, 0.35);
  color: var(--j-teal);
}

.journal__admin-btn--add:hover:not(:disabled) {
  background: rgba(94, 196, 182, 0.22);
}

.journal__admin-btn--muted {
  color: var(--j-text-muted);
}

.journal__admin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Empty ── */
.journal__empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--j-text-muted);
}

/* ── Article grid ── */
.journal__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.journal__card {
  display: flex;
  flex-direction: column;
  background: var(--j-surface);
  border: 1px solid var(--j-border);
  border-radius: var(--j-radius);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.journal__card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  border-color: var(--j-border-strong);
}

.journal__card-cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.journal__card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.journal__card:hover .journal__card-img {
  transform: scale(1.04);
}

.journal__card-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(255, 255, 255, 0.2);
}

.journal__card-placeholder svg {
  width: 48px;
  height: 48px;
}

.journal__card-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--j-accent);
  background: rgba(12, 14, 20, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(201, 169, 98, 0.3);
  border-radius: 6px;
}

.journal__card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 18px 20px 16px;
  gap: 8px;
}

.journal__card-date {
  font-size: 0.78rem;
  color: var(--j-text-muted);
  letter-spacing: 0.02em;
}

.journal__card-title {
  font-size: 1.15rem;
  font-weight: 650;
  line-height: 1.35;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.journal__card-desc {
  flex: 1;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--j-text-muted);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.journal__card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--j-border);
}

.journal__stats {
  display: flex;
  gap: 14px;
}

.journal__stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: var(--j-text-muted);
}

.journal__stat svg {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}

.journal__delete {
  padding: 4px 10px;
  font-size: 0.75rem;
  color: var(--j-danger);
  background: rgba(224, 108, 117, 0.1);
  border: 1px solid rgba(224, 108, 117, 0.25);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.journal__delete:hover {
  background: rgba(224, 108, 117, 0.2);
}

/* ── Pagination ── */
.journal__pagination {
  display: flex;
  justify-content: center;
  margin-top: 36px;
}

.journal__page-info {
  text-align: center;
  margin-top: 12px;
  font-size: 0.82rem;
  color: var(--j-text-muted);
}

/* ── Detail view ── */
.journal__detail {
  position: relative;
  max-width: 760px;
  margin: 0 auto;
}

.journal__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px 8px 12px;
  margin-bottom: 28px;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--j-text-muted);
  background: var(--j-surface);
  border: 1px solid var(--j-border);
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.journal__back svg {
  width: 18px;
  height: 18px;
}

.journal__back:hover {
  color: var(--j-text);
  border-color: var(--j-border-strong);
  background: var(--j-surface-hover);
}

.journal__detail-header {
  margin-bottom: 36px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--j-border);
}

.journal__detail-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: var(--j-text-muted);
}

.journal__detail-tag {
  padding: 3px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--j-teal);
  background: var(--j-teal-soft);
  border-radius: 6px;
}

.journal__detail-title {
  font-size: clamp(1.75rem, 4vw, 2.4rem);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  margin: 0;
}

/* ── Prose / Markdown ── */
.journal__prose {
  font-size: 1.02rem;
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.88);
  margin-bottom: 36px;
}

.journal__prose :deep(h1),
.journal__prose :deep(h2),
.journal__prose :deep(h3),
.journal__prose :deep(h4) {
  color: var(--j-text);
  font-weight: 650;
  margin: 2em 0 0.75em;
  line-height: 1.3;
}

.journal__prose :deep(h1) {
  font-size: 1.75rem;
  padding-bottom: 0.4em;
  border-bottom: 2px solid var(--j-accent);
}

.journal__prose :deep(h2) {
  font-size: 1.4rem;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--j-accent-soft);
}

.journal__prose :deep(h3) {
  font-size: 1.2rem;
}

.journal__prose :deep(p) {
  margin: 1em 0;
}

.journal__prose :deep(ul),
.journal__prose :deep(ol) {
  margin: 1em 0;
  padding-left: 1.5em;
}

.journal__prose :deep(li) {
  margin: 0.4em 0;
}

.journal__prose :deep(blockquote) {
  margin: 1.5em 0;
  padding: 14px 20px;
  border-left: 3px solid var(--j-accent);
  background: var(--j-accent-soft);
  border-radius: 0 8px 8px 0;
  font-style: italic;
  color: rgba(255, 255, 255, 0.8);
}

.journal__prose :deep(pre) {
  margin: 1.5em 0;
  padding: 18px 20px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--j-border);
  border-radius: 10px;
  overflow-x: auto;
  font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 0.88rem;
  line-height: 1.6;
}

.journal__prose :deep(code) {
  padding: 2px 7px;
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 0.88em;
  background: var(--j-teal-soft);
  color: var(--j-teal);
  border-radius: 5px;
}

.journal__prose :deep(pre code) {
  padding: 0;
  background: none;
  color: inherit;
  border-radius: 0;
}

.journal__prose :deep(a) {
  color: var(--j-teal);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s;
}

.journal__prose :deep(a:hover) {
  color: #7dd8cc;
}

.journal__prose :deep(img),
.journal__prose :deep(.article-image) {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  margin: 1.2em 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.journal__prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-size: 0.92rem;
  border-radius: 8px;
  overflow: hidden;
}

.journal__prose :deep(th),
.journal__prose :deep(td) {
  padding: 10px 14px;
  border-bottom: 1px solid var(--j-border);
  text-align: left;
}

.journal__prose :deep(th) {
  background: rgba(255, 255, 255, 0.06);
  font-weight: 600;
}

.journal__prose :deep(hr) {
  border: none;
  height: 1px;
  background: var(--j-border);
  margin: 2em 0;
}

.journal__prose :deep(.no-content),
.journal__prose :deep(.error-content) {
  color: var(--j-text-muted);
  font-style: italic;
}

/* ── Like button ── */
.journal__detail-actions {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.journal__like {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #d4566a, #b83a4f);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(184, 58, 79, 0.35);
  transition: transform 0.2s, box-shadow 0.2s;
}

.journal__like svg {
  width: 18px;
  height: 18px;
}

.journal__like:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(184, 58, 79, 0.45);
}

.journal__comments {
  margin-top: 8px;
}

/* ── Dialogs ── */
.journal__dialog :deep(.el-dialog) {
  background: rgba(16, 18, 26, 0.97);
  backdrop-filter: blur(16px);
  border: 1px solid var(--j-border-strong);
  border-radius: var(--j-radius);
}

.journal__dialog :deep(.el-dialog__title),
.journal__dialog :deep(.el-dialog__header) {
  color: var(--j-text);
}

.journal__dialog :deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.8);
}

.journal__dialog :deep(.el-input__wrapper),
.journal__dialog :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--j-border);
  color: var(--j-text);
  box-shadow: none;
}

.journal__file-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 0.88rem;
  color: var(--j-text-muted);
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed var(--j-border-strong);
  border-radius: 8px;
  cursor: pointer;
}

.journal__preview-wrap {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--j-border);
}

.journal__preview-img {
  display: block;
  width: 100%;
  max-height: 200px;
  object-fit: cover;
}

.journal__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.journal__dialog-empty {
  text-align: center;
  padding: 40px;
  color: var(--j-text-muted);
}

.journal__image-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 420px;
  overflow-y: auto;
}

.journal__image-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--j-border);
  border-radius: 8px;
  transition: background 0.2s;
}

.journal__image-row:hover {
  background: rgba(255, 255, 255, 0.07);
}

.journal__image-name {
  flex: 1;
  font-size: 0.85rem;
  color: var(--j-teal);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journal__image-name:hover {
  text-decoration: underline;
}

.journal__image-view {
  display: flex;
  justify-content: center;
}

.journal__image-full {
  max-width: 100%;
  max-height: 75vh;
  object-fit: contain;
  border-radius: 8px;
}

.journal__upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.journal__upload-item {
  text-align: center;
}

.journal__upload-thumb {
  width: 100%;
  height: 96px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--j-border);
}

.journal__upload-name {
  margin-top: 6px;
  font-size: 0.72rem;
  color: var(--j-text-muted);
  word-break: break-all;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .journal {
    padding: 12px 10px 32px;
  }

  .journal__shell {
    padding: 18px 14px;
    border-radius: 16px;
  }

  .journal__grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .journal__admin {
    flex-direction: column;
    align-items: flex-start;
  }

  .journal__admin-label {
    border-right: none;
    padding-right: 0;
  }

  .journal__card-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>