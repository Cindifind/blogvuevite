<template>
  <div class="fp-tablecell">
    <div id="content-container">
      <div class="blog-container">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading">
        <p>加载中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="loadArticles(0)" class="btna">重试</button>
      </div>

      <!-- 文章列表 -->
      <div class="articles-list" v-else-if="!selectedArticle">
        <!-- 管理员功能区 -->
        <div class="admin-panel" v-if="isAdmin">
          <h3>管理员功能</h3>
          <div class="admin-buttons">
            <button @click="toggleAddArticleContainer" class="add-article-btn">
              📝 添加文章
            </button>
            <button @click="toggleImageManagementContainer" class="image-management-btn">
              🖼️ 图片管理
            </button>
            <button @click="toggleUploadImageContainer" class="upload-image-btn">
              📤 上传图片
            </button>
            <button @click="cleanInvalidFiles" class="clean-files-btn" :disabled="cleaning">
              🧹 {{ cleaning ? '清理中...' : '清理无效文件' }}
            </button>
          </div>
        </div>

        <!-- 添加文章容器 -->
        <div v-if="showAddContainer" class="admin-container add-article-container">
          <div class="container-header">
            <h2>📝 添加新文章</h2>
            <button @click="closeAddArticleContainer" class="close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="container-content">
            <form @submit.prevent="addArticle">
              <div class="form-group">
                <label for="articleTitle">文章标题</label>
                <input 
                  type="text" 
                  id="articleTitle" 
                  v-model="newArticle.title" 
                  class="form-input"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="articleDescription">文章描述</label>
                <textarea 
                  id="articleDescription" 
                  v-model="newArticle.description" 
                  class="form-textarea"
                  rows="3"
                  placeholder="请输入文章描述"
                  required
                ></textarea>
              </div>
              
              <div class="form-group">
                <label for="articleLabel">文章标签</label>
                <input 
                  type="text" 
                  id="articleLabel" 
                  v-model="newArticle.label" 
                  class="form-input"
                  placeholder="请输入标签"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="articleImage">封面图片</label>
                <input 
                  type="file" 
                  id="articleImage" 
                  @change="handleImageSelect" 
                  accept="image/*"
                  class="form-input"
                />
                <div v-if="newArticle.imagePreview" class="image-preview">
                  <img :src="newArticle.imagePreview" alt="预览图片" />
                </div>
              </div>
              
              <div class="form-group">
                <label for="articleMd">Markdown文件</label>
                <input 
                  type="file" 
                  id="articleMd" 
                  @change="handleMdSelect" 
                  accept=".md"
                  class="form-input"
                  required
                />
              </div>
              
              <div class="form-actions">
                <button type="submit" class="submit-btn">发布文章</button>
                <button type="button" @click="closeAddArticleContainer" class="cancel-btn">取消</button>
              </div>
            </form>
          </div>
        </div>

        <!-- 图片管理容器 -->
        <div v-if="showImageContainer" class="admin-container image-management-container">
          <div class="container-header">
            <h2>🖼️ 图片管理</h2>
            <button @click="closeImageManagementContainer" class="close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="container-content">
            <div class="filename-list">
              <div v-for="image in images" :key="image.filename" class="filename-item">
                <div class="filename-content">
                  <span class="filename-text" @click="viewImage(image.filename)">{{ image.filename }}</span>
                  <span class="view-hint">点击查看</span>
                </div>
                <div class="filename-actions">
                  <button @click="deleteImage(image.filename)" class="delete-btn">删除</button>
                </div>
              </div>
            </div>
            <div v-if="images.length === 0" class="no-images">
              <p>暂无图片</p>
            </div>
          </div>
        </div>

        <!-- 图片查看模态框 -->
        <div v-if="showImageModal" class="image-modal-overlay" @click="closeImageModal">
          <div class="image-modal" @click.stop>
            <div class="modal-header">
              <h3>{{ currentImageName }}</h3>
              <button @click="closeImageModal" class="modal-close-btn">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="modal-body">
              <img :src="currentImageUrl" :alt="currentImageName" class="full-image" />
            </div>
          </div>
        </div>

        <!-- 上传图片容器 -->
        <div v-if="showUploadContainer" class="admin-container upload-image-container">
          <div class="container-header">
            <h2>📤 上传图片</h2>
            <button @click="closeUploadImageContainer" class="close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="container-content">
            <form @submit.prevent="uploadImages">
              <div class="form-group">
                <label for="uploadFiles">选择图片文件</label>
                <input 
                  type="file" 
                  id="uploadFiles" 
                  ref="uploadFileInput"
                  @change="handleUploadSelect" 
                  accept="image/*"
                  multiple
                  class="form-input"
                />
              </div>
              
              <div v-if="uploadPreviews.length > 0" class="upload-previews">
                <div v-for="(preview, index) in uploadPreviews" :key="index" class="upload-preview">
                  <img :src="preview.url" :alt="preview.name" />
                  <p>{{ preview.name }}</p>
                </div>
              </div>
              
              <div class="form-actions">
                <button type="submit" class="submit-btn" :disabled="uploadPreviews.length === 0">上传图片</button>
                <button type="button" @click="closeUploadImageContainer" class="cancel-btn">取消</button>
              </div>
            </form>
          </div>
        </div>

        <div class="article-item" v-for="article in articles" :key="article.timestamp" @click="showArticle(article)">
          <!-- 封面图片 - 只有当image存在且不为空时才显示 -->
          <div class="article-cover" v-if="article.image && article.image.trim()">
            <img :src="getImageUrl(article.image)" :alt="article.title" @error="handleImageError" />
          </div>
          <!-- 当没有图片时显示默认占位符 -->
          <div class="article-cover article-cover-placeholder" v-else>
            <div class="placeholder-content">
              <i class="placeholder-icon">📄</i>
              <span class="placeholder-text">暂无封面</span>
            </div>
          </div>
          
          <div class="article-main">
            <div class="article-header">
              <h2 class="article-title">{{ article.title }}</h2>
              <div class="article-meta">
                <span class="article-date">{{ formatDate(article.timestamp) }}</span>
                <span class="article-labels" v-if="article.label">{{ article.label }}</span>
              </div>
            </div>
            <p class="article-description" v-if="article.description">{{ article.description }}</p>
            <div class="article-stats">
              <span class="article-views">👁️ {{ article.views || 0 }} 次浏览</span>
              <span class="article-likes">❤️ {{ article.likes || 0 }} 点赞</span>
              <span class="article-comments">💬 {{ article.comment || 0 }} 评论</span>
              <button 
                v-if="isAdmin" 
                @click.stop="deleteArticle(article.timestamp)" 
                class="btna delete-article-btn"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
        </div>

        <!-- 分页控件 -->
        <div class="pagination" v-if="totalPages > 1">
          <button 
            @click="loadArticles(Math.max(0, currentPage - 1))" 
            :disabled="currentPage === 0"
            class="btna pagination-btn"
          >
            ← 上一页
          </button>
          
          <!-- 页码显示 -->
          <div class="page-numbers">
            <button 
              v-for="page in getVisiblePages()" 
              :key="page"
              @click="loadArticles(page - 1)"
              :class="['btna', 'page-number', { 'active': page - 1 === currentPage }]"
            >
              {{ page }}
            </button>
          </div>
          
          <button 
            @click="loadArticles(Math.min(totalPages - 1, currentPage + 1))" 
            :disabled="currentPage >= totalPages - 1"
            class="btna pagination-btn"
          >
            下一页 →
          </button>
        </div>
        
        <!-- 分页信息 -->
        <div class="pagination-info" v-if="totalPages > 0">
          <span>共 {{ totalPages }} 页，当前第 {{ currentPage + 1 }} 页</span>
        </div>
      </div>

      <!-- 文章详情 -->
      <div class="article-detail" v-else>
        <button @click="backToList" class="back-button">← 返回列表</button>
        
        <div class="article-header">
          <h1>{{ selectedArticle.title }}</h1>
          <div class="article-meta">
            <span class="article-date">{{ formatDate(selectedArticle.timestamp) }}</span>
            <span class="article-labels" v-if="selectedArticle.labels">{{ selectedArticle.labels }}</span>
          </div>
        </div>

        <div class="article-body">
          <!-- 显示Markdown内容 -->
          <div class="markdown-section" v-if="markdownContent" v-html="markdownContent"></div>
          <!-- 如果没有Markdown内容，显示原始内容 -->
          <div v-else v-html="selectedArticle.content"></div>
        </div>
        
        <div class="article-actions">
          <button @click="likeArticle(selectedArticle.timestamp)" class="like-button">
            ❤️ 点赞 ({{ selectedArticle.likes || 0 }})
          </button>
        </div>
        
        <!-- 评论区域 -->
        <CommentSection 
          :articleId="selectedArticle.timestamp" 
          v-if="selectedArticle"
        />
      </div>

      <!-- 添加文章对话框 -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { marked } from 'marked'
import { ElMessage, ElMessageBox } from 'element-plus'
import CommentSection from './CommentSection.vue'

// 路由相关
const route = useRoute()
const router = useRouter()

// 使用认证状态
const { isLoggedIn, userInfo } = useAuth()

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
    code({ text, lang }) {
      const language = (lang || '').trim().toLowerCase()
      let codeHtml = escapeHtml(text)
      if (Prism?.languages && Prism?.highlight && language) {
        const grammar = Prism.languages[language]
        if (grammar) {
          try {
            codeHtml = Prism.highlight(text, grammar, language)
          } catch (_) { /* ignore */ }
        }
      }
      const langClass = language ? `language-${language}` : ''
      return `<pre><code class="${langClass}">${codeHtml}</code></pre>`
    }
  }

  // 应用渲染器与高亮回调
  marked.use({ renderer })
  marked.setOptions({
    breaks: true,
    gfm: true
  })
} catch (_) {}
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
    const response = await fetch(`https://luren.online:2345/proxy/page?pageNum=${page}&pageSize=${pageSize}`)
    
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
  return `https://luren.online:2345/proxy/image?filename=${filename}`;
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
    const url = `https://luren.online:2345/proxy/md?filename=${encodeURIComponent(filename)}`
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
    const token = localStorage.getItem('userToken')
    const response = await fetch('https://luren.online:2345/proxy/likeArticle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ timestamp })
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
    
    const token = localStorage.getItem('userToken')
    const response = await fetch('https://luren.online:2345/proxy/upload', {
      method: 'POST',
      headers: {
        'Authorization': token
      },
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
    
    const token = localStorage.getItem('userToken')
    const response = await fetch(`https://luren.online:2345/proxy/delete?timestamp=${timestamp}`, {
      method: 'GET',
      headers: {
        'Authorization': token
      }
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
    const token = localStorage.getItem('userToken')
    const response = await fetch('https://luren.online:2345/proxy/getMdImageList', {
      headers: {
        'Authorization': token
      }
    })
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
    const token = localStorage.getItem('userToken')
    // 使用FormData或URLSearchParams发送请求参数
    const formData = new FormData()
    formData.append('mdImageName', filename)
    
    const response = await fetch('https://luren.online:2345/proxy/deleteMdImage', {
      method: 'POST',
      headers: {
        'Authorization': token
      },
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
  currentImageUrl.value = `https://luren.online:2345/proxy/image?filename=${filename}`
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
    
    const token = localStorage.getItem('userToken')
    const response = await fetch('https://luren.online:2345/proxy/mdImage', {
      method: 'POST',
      headers: {
        'authorization': token  // 改为小写，匹配Java示例
      },
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
    const token = localStorage.getItem('userToken')
    const servicesResponse = await fetch('https://luren.online:2345/cline', {
      method: 'GET',
      headers: {
        'authorization': token
      }
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
        
        const cleanResponse = await fetch(cleanUrl, {
          method: 'GET',
          headers: {
            'authorization': token
          }
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

<style scoped>
/* 主容器样式 - 使用index.css中的#content-container样式 */
#content-container {
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 1200px;
  width: 100%;
  min-height: 600px; /* 添加默认最小高度 */
  margin: 40px auto;
  animation: content-fadeIn 1.5s ease-out;
  position: relative;
  z-index: 1;
}

@keyframes content-fadeIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.fp-tablecell {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.blog-container {
  width: 100%;
  color: #fff;
}

/* 加载和错误状态 */
.loading, .error {
  text-align: center;
  padding: 40px;
  color: #fff;
}

.loading p, .error p {
  font-size: 1.2rem;
  margin-bottom: 20px;
}

/* 管理员面板 */
.admin-panel {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 30px;
  backdrop-filter: blur(5px);
}

.admin-panel h3 {
  color: #fff;
  margin-bottom: 20px;
  font-size: 1.5rem;
}

.admin-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 管理员功能按钮样式 */
.add-article-btn {
  padding: 10px 18px;
  background: rgba(40, 167, 69, 0.8);
  border: 1px solid rgba(40, 167, 69, 0.3);
  border-radius: 20px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(40, 167, 69, 0.2);
}

.add-article-btn:hover {
  background: rgba(40, 167, 69, 1);
  border-color: rgba(40, 167, 69, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.image-management-btn {
  padding: 10px 18px;
  background: rgba(23, 162, 184, 0.8);
  border: 1px solid rgba(23, 162, 184, 0.3);
  border-radius: 20px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(23, 162, 184, 0.2);
}

.image-management-btn:hover {
  background: rgba(23, 162, 184, 1);
  border-color: rgba(23, 162, 184, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
}

.upload-image-btn {
  padding: 10px 18px;
  background: rgba(255, 193, 7, 0.8);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 20px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
}

.upload-image-btn:hover {
  background: rgba(255, 193, 7, 1);
  border-color: rgba(255, 193, 7, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
}

.clean-files-btn {
  padding: 10px 18px;
  background: rgba(108, 117, 125, 0.8);
  border: 1px solid rgba(108, 117, 125, 0.3);
  border-radius: 20px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(108, 117, 125, 0.2);
}

.clean-files-btn:hover:not(:disabled) {
  background: rgba(108, 117, 125, 1);
  border-color: rgba(108, 117, 125, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

.clean-files-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 点赞按钮样式 */
.like-button {
  padding: 10px 20px;
  background: rgba(220, 53, 69, 0.8);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 25px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
  margin-top: 20px;
}

.like-button:hover {
  background: rgba(220, 53, 69, 1);
  border-color: rgba(220, 53, 69, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.like-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(220, 53, 69, 0.2);
}



/* 文章列表 */
.articles-list {
  text-align: left;
}

.article-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.article-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.article-cover {
  width: 200px;
  height: 150px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.article-cover-placeholder {
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(255, 255, 255, 0.3);
}

.placeholder-content {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

.placeholder-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 10px;
}

.placeholder-text {
  font-size: 1rem;
}

.article-main {
  flex: 1;
}

.article-header {
  margin-bottom: 15px;
}

.article-title {
  color: #fff;
  font-size: 1.5rem;
  margin-bottom: 10px;
  font-weight: 600;
}

.article-meta {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.article-description {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  margin-bottom: 15px;
  font-size: 0.95rem;
  font-style: italic;
}

.article-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.delete-article-btn {
  padding: 6px 12px;
  background: rgba(255, 69, 58, 0.8);
  border: 1px solid rgba(255, 69, 58, 0.3);
  border-radius: 15px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  min-width: auto;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(255, 69, 58, 0.2);
}

.delete-article-btn:hover {
  background: rgba(255, 69, 58, 1);
  border-color: rgba(255, 69, 58, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 69, 58, 0.3);
}

.delete-article-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(255, 69, 58, 0.2);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin: 30px 0;
  flex-wrap: wrap;
}

.pagination-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.pagination-btn:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
  border-color: #ddd;
}

.page-numbers {
  display: flex;
  gap: 5px;
}

.page-number {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 40px;
  text-align: center;
}

.page-number:hover {
  background: #f8f9fa;
  border-color: #007bff;
}

.page-number.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.pagination-info {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin-top: 10px;
}

.page-info {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
}

/* 文章详情 */
.article-detail {
  text-align: left;
  position: relative;
}

.back-button {
  position: absolute;
  top: -10px;
  left: 0;
  padding: 8px 16px;
  background: rgba(108, 117, 125, 0.8);
  border: 1px solid rgba(108, 117, 125, 0.3);
  border-radius: 20px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  z-index: 10;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(108, 117, 125, 0.2);
}

.back-button:hover {
  background: rgba(108, 117, 125, 1);
  border-color: rgba(108, 117, 125, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

.back-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(108, 117, 125, 0.2);
}

.article-detail .article-header {
  padding: 60px 0 30px 0;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 30px;
}

.article-detail h1 {
  color: #fff;
  font-size: 2.5rem;
  margin-bottom: 20px;
  font-weight: 700;
}

/* 文章详情内容样式 */
.article-body {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.8;
  font-size: 1.1rem;
  margin-bottom: 40px;
}

.article-body .no-content {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  padding: 40px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.article-body h1,
.article-body h2,
.article-body h3 {
  color: #fff;
  margin: 30px 0 15px 0;
  font-weight: 600;
}

.article-body h1 {
  font-size: 2rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 10px;
}

.article-body h2 {
  font-size: 1.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.article-body h3 {
  font-size: 1.3rem;
}

.article-body p {
  margin: 15px 0;
  text-align: justify;
}

/* Markdown内容样式 */
.markdown-section {
  width: 100%;
}

.markdown-content {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  color: #fff;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
}

.no-content,
.error-content {
  text-align: center;
  color: #999;
  font-style: italic;
  padding: 40px 20px;
}

.article-body strong {
  color: #fff;
  font-weight: 700;
}

.article-body em {
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.article-body code {
  background: rgba(255, 255, 255, 0.1);
  color: #ff69b4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

/* 管理员独立容器样式 - 采用Login.vue风格 */
.admin-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  border: none;
  z-index: 1000;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  animation: containerFadeIn 0.5s ease-out;
}

@keyframes containerFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 35px;
  background: #fff;
  color: #333;
  border-radius: 15px 15px 0 0;
  border-bottom: 1px solid #ddd;
}

.container-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: normal;
  color: #333;
}

.close-btn {
  background: rgba(0, 0, 0, 0.1);
  border: none;
  color: #666;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  font-weight: normal;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  padding: 0;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.2);
  color: #333;
  transform: scale(1.1);
}

.container-content {
  padding: 30px;
  max-height: 70vh;
  overflow-y: auto;
}

/* 添加文章容器特定样式 */
.add-article-container {
  width: 600px;
}

.add-article-container .container-header {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
}

/* 图片管理容器特定样式 */
.image-management-container {
  width: 800px;
}

.image-management-container .container-header {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
}

/* 文件名列表样式 */
.filename-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.filename-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.filename-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.filename-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.filename-text {
  font-size: 1rem;
  color: #333;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.3s ease;
}

.filename-text:hover {
  color: #2196F3;
}

.view-hint {
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
}

.filename-actions {
  display: flex;
  gap: 8px;
}

.delete-btn {
  background: #ff4757;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background: #ff3742;
  transform: translateY(-2px);
}

/* 图片查看模态框样式 */
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.image-modal {
  background: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
  word-break: break-all;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 5px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.modal-close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.modal-body {
  padding: 20px;
  text-align: center;
}

.full-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
}

.no-images {
  text-align: center;
  color: #666;
  font-size: 1.1rem;
  padding: 40px;
}

/* 上传图片容器特定样式 */
.upload-image-container {
  width: 600px;
}

.upload-image-container .container-header {
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
}

.upload-previews {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.upload-preview {
  text-align: center;
  background: white;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.upload-preview img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 8px;
}

.upload-preview p {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
  word-break: break-all;
}

/* 表单样式 */
.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 12px 20px;
  border: 1px solid #ddd;
  border-radius: 25px;
  outline: none;
  transition: all 0.3s ease;
  font-size: 14px;
  box-sizing: border-box;
  background: white;
}

/* 文件选择按钮样式 */
.form-input[type="file"] {
  position: relative;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 25px;
  background: white;
  cursor: default;
  color: #333;
  font-size: 14px;
  pointer-events: none; /* 禁用整个输入框的点击 */
}

.form-input[type="file"]::-webkit-file-upload-button {
  pointer-events: auto; /* 只允许按钮部分可点击 */
  background: #ff69b4;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
  min-width: 100px;
  text-align: center;
  white-space: nowrap;
  margin-right: 10px;
}

.form-input[type="file"]::-webkit-file-upload-button:hover {
  background: #ff8ec7;
  transform: translateY(-1px);
}



.form-input:focus, .form-textarea:focus {
  border-color: #ff69b4;
  box-shadow: 0 0 8px rgba(255, 105, 180, 0.5);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  border-radius: 15px;
}

.image-preview {
  margin-top: 15px;
  text-align: center;
}

.image-preview img {
  max-width: 200px;
  max-height: 150px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e1e5e9;
}

.submit-btn, .cancel-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: #ff69b4;
  border: none;
  border-radius: 25px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 1s ease;
  font-weight: bold;
  letter-spacing: 1px;
}

.submit-btn:hover {
  background: #ff8ec7;
  transform: translateY(-2px);
  transition: all 1s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.submit-btn:active {
  transform: translateY(0);
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cancel-btn {
  width: 100%;
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 25px;
  color: #666;
  font-size: 16px;
  cursor: pointer;
  transition: all 1s ease;
  font-weight: bold;
  letter-spacing: 1px;
}

.cancel-btn:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  transition: all 1s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

/* Markdown渲染样式 */
.markdown-section {
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
}

.markdown-section h1,
.markdown-section h2,
.markdown-section h3,
.markdown-section h4,
.markdown-section h5,
.markdown-section h6 {
  color: #fff;
  margin: 30px 0 20px 0;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-section h1 {
  font-size: 2.2em;
  border-bottom: 2px solid #ff69b4;
  padding-bottom: 10px;
}

.markdown-section h2 {
  font-size: 1.8em;
  border-bottom: 1px solid rgba(255, 105, 180, 0.5);
  padding-bottom: 8px;
}

.markdown-section h3 {
  font-size: 1.5em;
}

.markdown-section h4 {
  font-size: 1.3em;
}

.markdown-section h5 {
  font-size: 1.1em;
}

.markdown-section h6 {
  font-size: 1em;
}

.markdown-section p {
  margin: 16px 0;
  text-align: justify;
}

.markdown-section ul,
.markdown-section ol {
  margin: 16px 0;
  padding-left: 30px;
}

.markdown-section li {
  margin: 8px 0;
}

.markdown-section blockquote {
  border-left: 4px solid #ff69b4;
  background: rgba(255, 105, 180, 0.1);
  margin: 20px 0;
  padding: 15px 20px;
  border-radius: 0 8px 8px 0;
  font-style: italic;
}

.markdown-section pre:not([class*="language-"]) {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  overflow-x: auto;
}

.markdown-section pre code:not([class*="language-"]) {
  /* 避免覆盖 hljs 主题色，仅在未高亮时应用 */
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: 0.95em;
  line-height: 1.5;
}

.markdown-section pre code:not([class*="language-"]) {
  color: rgba(255, 255, 255, 0.9);
}

.markdown-section code {
  background: rgba(255, 255, 255, 0.1);
  color: #ff69b4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-section a {
  color: #ff69b4;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}

.markdown-section a:hover {
  color: #ff8ec7;
  border-bottom-color: #ff8ec7;
}

.markdown-section img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.markdown-section table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.markdown-section th,
.markdown-section td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.markdown-section th {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: 600;
}

.markdown-section strong {
  color: #fff;
  font-weight: 700;
}

.markdown-section em {
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.markdown-section hr {
  border: none;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ff69b4, transparent);
  margin: 30px 0;
}

.article-body pre:not([class*="language-"]) {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  overflow-x: auto;
}

.article-body pre code:not([class*="language-"]) {
  /* 避免覆盖 hljs 主题色，仅在未高亮时应用 */
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: 0.95em;
  line-height: 1.5;
}

/* 让样式作用于 v-html 渲染的内容 */
:deep(.markdown-section pre:not([class*="language-"])) {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  overflow-x: auto;
}

:deep(.markdown-section pre code:not([class*="language-"])) {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: 0.95em;
  line-height: 1.5;
}

:deep(.markdown-section pre code:not([class*="language-"])) {
  color: rgba(255, 255, 255, 0.9);
}

.article-body pre code:not([class*="language-"]) {
  color: rgba(255, 255, 255, 0.9);
}

.article-body a {
  color: #ff69b4;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}

.article-body a:hover {
  color: #ff8ec7;
  border-bottom-color: #ff8ec7;
}

.article-body blockquote {
  border-left: 4px solid #ff69b4;
  background: rgba(255, 105, 180, 0.1);
  margin: 20px 0;
  padding: 15px 20px;
  border-radius: 0 8px 8px 0;
  font-style: italic;
}

.article-body ul,
.article-body ol {
  margin: 15px 0;
  padding-left: 30px;
}

.article-body li {
  margin: 8px 0;
}

.article-body .article-image,
.article-body img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.article-body hr {
  border: none;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  margin: 30px 0;
}

.article-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.article-body th,
.article-body td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.article-body th {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: 600;
}



.article-body p {
  margin: 15px 0;
  text-align: justify;
}

.article-body strong {
  color: #fff;
  font-weight: 700;
}

.article-body em {
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.article-body code {
  background: rgba(255, 255, 255, 0.1);
  color: #ff69b4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.article-body pre {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  overflow-x: auto;
}

.article-body pre code {
  background: none;
  color: rgba(255, 255, 255, 0.9);
  padding: 0;
  border-radius: 0;
  font-size: 0.95em;
  line-height: 1.5;
}

.article-body a {
  color: #ff69b4;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}

.article-body a:hover {
  color: #ff8ec7;
  border-bottom-color: #ff8ec7;
}

.article-body blockquote {
  border-left: 4px solid #ff69b4;
  background: rgba(255, 105, 180, 0.1);
  margin: 20px 0;
  padding: 15px 20px;
  border-radius: 0 8px 8px 0;
}

.article-body ul,
.article-body ol {
  margin: 15px 0;
  padding-left: 30px;
}

.article-body li {
  margin: 8px 0;
}

.article-body .article-image,
.article-body img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.article-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.article-body th,
.article-body td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.article-body th {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: 600;
}



.article-body p {
  margin: 15px 0;
  text-align: justify;
}

.article-body strong {
  color: #fff;
  font-weight: 700;
}

.article-body em {
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.article-body code {
  background: rgba(255, 255, 255, 0.1);
  color: #ff69b4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.article-body pre {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  overflow-x: auto;
}

.article-body pre code {
  background: none;
  color: rgba(255, 255, 255, 0.9);
  padding: 0;
  border-radius: 0;
  font-size: 0.95em;
  line-height: 1.5;
}

.article-body code {
  background: rgba(255, 255, 255, 0.1);
  color: #ff69b4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.article-body pre code {
  background: none;
  color: rgba(255, 255, 255, 0.9);
  padding: 0;
  border-radius: 0;
  font-size: 0.95em;
  line-height: 1.5;
}

.article-body a {
  color: #ff69b4;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}

.article-body a:hover {
  color: #ff8ec7;
  border-bottom-color: #ff8ec7;
}

.article-body blockquote {
  border-left: 4px solid #ff69b4;
  background: rgba(255, 105, 180, 0.1);
  margin: 20px 0;
  padding: 15px 20px;
  border-radius: 0 8px 8px 0;
}

.article-body ul,
.article-body ol {
  margin: 15px 0;
  padding-left: 30px;
}

.article-body li {
  margin: 8px 0;
}

.article-body img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.article-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.article-body th,
.article-body td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.article-body th {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: 600;
}

.article-body p {
  margin: 15px 0;
  text-align: justify;
}

.article-body strong {
  color: #fff;
  font-weight: 700;
}

.article-body em {
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.article-body code {
  background: rgba(255, 255, 255, 0.1);
  color: #ff69b4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.article-body pre {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  overflow-x: auto;
}

.article-body pre code {
  background: none;
  color: rgba(255, 255, 255, 0.9);
  padding: 0;
  border-radius: 0;
  font-size: 0.95em;
  line-height: 1.5;
}

.article-body a {
  color: #ff69b4;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}

.article-body a:hover {
  color: #ff8ec7;
  border-bottom-color: #ff8ec7;
}

.article-body blockquote {
  border-left: 4px solid #ff69b4;
  background: rgba(255, 105, 180, 0.1);
  margin: 20px 0;
  padding: 15px 20px;
  border-radius: 0 8px 8px 0;
}

.article-body ul,
.article-body ol {
  margin: 15px 0;
  padding-left: 30px;
}

.article-body li {
  margin: 8px 0;
}

.article-body img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.article-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.article-body th,
.article-body td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.article-body th {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: 600;
}

.article-body p {
  margin: 15px 0;
  text-align: justify;
}

.article-body strong {
  color: #fff;
  font-weight: 700;
}

.article-body em {
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.article-body code {
  background: rgba(255, 255, 255, 0.1);
  color: #ff69b4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.article-body pre {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  overflow-x: auto;
}

.article-body pre code {
  background: none;
  color: rgba(255, 255, 255, 0.9);
  padding: 0;
  border-radius: 0;
  font-size: 0.95em;
  line-height: 1.5;
}

.article-body a {
  color: #ff69b4;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}

.article-body a:hover {
  color: #ff8ec7;
  border-bottom-color: #ff8ec7;
}

.article-body blockquote {
  border-left: 4px solid #ff69b4;
  background: rgba(255, 105, 180, 0.1);
  margin: 20px 0;
  padding: 15px 20px;
  border-radius: 0 8px 8px 0;
}

.article-body ul,
.article-body ol {
  margin: 15px 0;
  padding-left: 30px;
}

.article-body li {
  margin: 8px 0;
}

.article-body img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.article-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.article-body th,
.article-body td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.article-body th {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: 600;
}

.article-body p {
  margin: 15px 0;
  text-align: justify;
}

.article-body strong {
  color: #fff;
  font-weight: 700;
}

.article-body em {
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.article-body code {
  background: rgba(255, 255, 255, 0.1);
  color: #ff69b4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

</style>
