<template>
  <!-- 工具列表独立容器 -->
  <div class="fp-tablecell">
    <!-- 透明容器包裹整个页面 -->
    <div class="transparent-wrapper">
      <div class="tools-grid-container">
        <div class="management-header">
          <h1>Toy Box</h1>
          <p>管理和维护系统工具集合</p>
          
          <!-- 管理员添加工具按钮 -->
          <div v-if="isLoggedIn" class="admin-controls">
            <el-button type="primary" @click="showAddDialog = true">
              <el-icon><Plus /></el-icon>
              添加工具
            </el-button>
          </div>
        </div>
      <div class="tools-grid" v-loading="loading">

        <div 
          v-for="tool in tools" 
          :key="tool.id"
          class="tool-card"
          @click="openTool(tool)"
        >
          <div class="tool-icon">
            <img 
              :src="getToolIcon(tool)" 
              :alt="tool.name || tool.description"
              @error="handleIconError"
              loading="lazy"
            />
          </div>
          <div class="tool-info">
            <h3 class="tool-title">{{ tool.name || tool.description }}</h3>
            <p class="tool-description">{{ tool.description }}</p>
            <p class="tool-url">{{ formatUrl(tool.url) }}</p>
          </div>
          <div class="tool-actions">
            <el-button size="small" type="primary" @click.stop="openTool(tool)">
              <el-icon><Link /></el-icon>
              访问
            </el-button>
            <!-- 管理员操作按钮 -->
            <div v-if="isLoggedIn" class="admin-actions">
              <el-button size="small" type="warning" @click.stop="editTool(tool)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="danger" @click.stop="deleteTool(tool)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>

        <!-- 空状态 -->
        <div v-if="!loading && tools.length === 0" class="empty-state">
          <el-empty description="暂无工具">
            <el-button v-if="isLoggedIn" type="primary" @click="showAddDialog = true">
              添加第一个工具
            </el-button>
          </el-empty>
        </div>

      </div>
    </div>
  </div>

  <!-- 弹窗组件移到fp-tablecell外部 -->
  <!-- 添加工具对话框 -->
  <el-dialog
    v-model="showAddDialog"
    title="添加新工具"
    width="500px"
    :before-close="handleAddDialogClose"
    class="global-dialog"
  >
    <el-form :model="newTool" :rules="toolRules" ref="toolFormRef" label-width="80px">
      <el-form-item label="工具名称" prop="name">
        <el-input 
          v-model="newTool.name" 
          placeholder="请输入工具名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="工具描述" prop="description">
        <el-input 
          v-model="newTool.description" 
          placeholder="请输入工具描述"
          maxlength="100"
          show-word-limit
          type="textarea"
          :rows="2"
        />
      </el-form-item>
      <el-form-item label="工具URL" prop="url">
        <el-input 
          v-model="newTool.url" 
          placeholder="请输入完整的URL地址"
          @blur="previewIcon"
        />
      </el-form-item>
      <el-form-item label="API地址列表">
        <div class="api-list-container">
          <div v-for="(api, index) in newTool.apiList" :key="index" class="api-item">
            <el-input 
              v-model="newTool.apiList[index]" 
              placeholder="请输入API地址"
              class="api-input"
            />
            <el-button 
              type="danger" 
              size="small" 
              @click="removeApi(index, 'new')"
              :disabled="newTool.apiList.length <= 1"
              class="remove-api-btn"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button 
            type="primary" 
            size="small" 
            @click="addApi('new')"
            class="add-api-btn"
          >
            <el-icon><Plus /></el-icon>
            添加API
          </el-button>
        </div>
      </el-form-item>
      
      <!-- 图标预览 -->
      <el-form-item label="图标预览">
        <div class="icon-preview">
          <img 
            v-if="newTool.url" 
            :src="getPreviewIcon(newTool.url)" 
            alt="图标预览"
            @error="handleIconError"
          />
          <span v-else class="no-icon">输入URL后显示图标预览</span>
        </div>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleAddDialogClose">取消</el-button>
        <el-button type="primary" @click="addTool" :loading="adding">
          添加
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 编辑工具对话框 -->
  <el-dialog
    v-model="showEditDialog"
    title="编辑工具"
    width="500px"
    :before-close="handleEditDialogClose"
    class="global-dialog"
  >
    <el-form :model="editingTool" :rules="toolRules" ref="editFormRef" label-width="80px">
      <el-form-item label="工具名称" prop="name">
        <el-input 
          v-model="editingTool.name" 
          placeholder="请输入工具名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="工具描述" prop="description">
        <el-input 
          v-model="editingTool.description" 
          placeholder="请输入工具描述"
          maxlength="100"
          show-word-limit
          type="textarea"
          :rows="2"
        />
      </el-form-item>
      <el-form-item label="工具URL" prop="url">
        <el-input 
          v-model="editingTool.url" 
          placeholder="请输入完整的URL地址"
        />
      </el-form-item>
      <el-form-item label="API地址列表">
        <div class="api-list-container">
          <div v-for="(api, index) in editingTool.apiList" :key="index" class="api-item">
            <el-input 
              v-model="editingTool.apiList[index]" 
              placeholder="请输入API地址"
              class="api-input"
            />
            <el-button 
              type="danger" 
              size="small" 
              @click="removeApi(index, 'edit')"
              :disabled="editingTool.apiList.length <= 1"
              class="remove-api-btn"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button 
            type="primary" 
            size="small" 
            @click="addApi('edit')"
            class="add-api-btn"
          >
            <el-icon><Plus /></el-icon>
            添加API
          </el-button>
        </div>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleEditDialogClose">取消</el-button>
        <el-button type="primary" @click="updateTool" :loading="updating">
          更新
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Link, Edit, Delete } from '@element-plus/icons-vue'
import { useAuth } from '../composables/useAuth'
import { getCachedFavicon } from '../utils/iconUtils'

// 使用认证
const { isLoggedIn } = useAuth()

// 响应式数据
const tools = ref([])
const loading = ref(false)
const adding = ref(false)
const updating = ref(false)
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const toolFormRef = ref(null)
const editFormRef = ref(null)
const toolIcons = ref(new Map()) // 存储工具图标

// 表单数据
const newTool = reactive({
  name: '',
  url: '',
  description: '',
  apiList: [''] // 改为数组，默认有一个空字符串
})

// 编辑工具数据
const editingTool = reactive({
  id: null,
  name: '',
  url: '',
  originalUrl: '', // 保存原始URL，用于后端WHERE条件
  description: '',
  apiList: [''] // 改为数组，默认有一个空字符串
})

// 表单验证规则
const toolRules = {
  name: [
    { required: true, message: '请输入工具名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入工具描述', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入工具URL', trigger: 'blur' },
    { 
      pattern: /^https?:\/\/.+/, 
      message: '请输入有效的URL地址（以http://或https://开头）', 
      trigger: 'blur' 
    }
  ]
}

// API配置
const API_BASE_URL = 'http://luren.online:2345'

// 获取存储的token
const getToken = () => {
  return localStorage.getItem('userToken')
}

// 通用请求处理函数
const request = async (url, options = {}, requireAuth = false) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    // 如果需要认证，添加Authorization头
    if (requireAuth) {
      const token = getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(url, {
      headers,
      ...options
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('API请求失败:', error)
    throw error
  }
}

// 获取所有H5工具统计数据
const getH5Stats = async () => {
  return await request(`${API_BASE_URL}/proxy/h5Stats`, {
    method: 'GET'
  })
}

// 插入新的H5工具URL
const insertH5Url = async (h5Stats, apiList) => {
  return await request(`${API_BASE_URL}/proxy/insertH5Url`, {
    method: 'POST',
    body: JSON.stringify({
      h5Stats: h5Stats,
      apiList: apiList
    })
  }, true) // 需要认证
}

// 删除H5工具URL
const deleteH5Url = async (url) => {
  return await request(`${API_BASE_URL}/proxy/deleteH5Url?url=${encodeURIComponent(url)}`, {
    method: 'POST'
  }, true) // 需要认证
}

// 添加API到列表
const addApi = (formType) => {
  if (formType === 'new') {
    newTool.apiList.push('')
  } else if (formType === 'edit') {
    editingTool.apiList.push('')
  }
}

// 从列表中移除API
const removeApi = (index, formType) => {
  if (formType === 'new' && newTool.apiList.length > 1) {
    newTool.apiList.splice(index, 1)
  } else if (formType === 'edit' && editingTool.apiList.length > 1) {
    editingTool.apiList.splice(index, 1)
  }
}

// 更新H5工具URL
const updateH5Url = async (originalUrl, updateUrl, apiList, h5Stats) => {
  return await request(`${API_BASE_URL}/proxy/updateH5Url`, {
    method: 'POST',
    body: JSON.stringify({ 
      url: originalUrl,        // 原始URL，用于WHERE条件
      updateUrl: updateUrl,    // 新的URL
      apiList: apiList,
      h5Stats: h5Stats 
    })
  }, true) // 需要认证
}

// 验证URL格式
const isValidUrl = (url) => {
  try {
    new URL(url)
    return /^https?:\/\/.+/.test(url)
  } catch {
    return false
  }
}

// 获取网站favicon图标URL
const getFaviconUrl = (url) => {
  if (!url) return '/default-icon.svg'
  
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`
  } catch (error) {
    console.warn('获取favicon失败:', error)
    return '/default-icon.svg'
  }
}

// 格式化显示URL
const formatDisplayUrl = (url) => {
  if (!url) return ''
  
  try {
    // 处理没有协议的URL
    let fullUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url
    }
    
    const urlObj = new URL(fullUrl)
    return urlObj.hostname
  } catch (error) {
    return url
  }
}

// 安全打开外部链接
const openUrl = (url, target = '_blank') => {
  if (!isValidUrl(url)) {
    console.error('无效的URL:', url)
    return
  }
  window.open(url, target, 'noopener,noreferrer')
}

// 获取工具列表
const fetchTools = async () => {
  loading.value = true
  try {
    const response = await getH5Stats()
    
    if (response.status === '200') {
      tools.value = response.data || []
      
      // 预加载图标
      console.log('开始预加载工具图标...')
      
      // 清空现有图标缓存
      toolIcons.value.clear()
      console.log('已清空图标缓存')
      
      // 为每个工具设置默认图标，并异步加载真实图标
      tools.value.forEach(tool => {
        // 先设置默认图标，确保立即可点击
        toolIcons.value.set(tool.id, '/default-icon.svg')
      })
      
      // 异步加载真实图标，不影响用户交互
      loadToolIconsAsync()
    } else {
      throw new Error(response.message || '获取工具列表失败')
    }
  } catch (error) {
    console.error('获取工具列表失败:', error)
    ElMessage.error(error.message || '获取工具列表失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 异步加载工具图标，不影响用户交互
const loadToolIconsAsync = async () => {
  // 使用setTimeout让图标加载不阻塞主线程
  setTimeout(async () => {
    for (const tool of tools.value) {
      try {
        console.log(`正在获取工具 ${tool.name || tool.description} 的图标`)
        const iconUrl = await getUniqueToolIcon(tool.url)
        toolIcons.value.set(tool.id, iconUrl)
        
        // 触发视图更新
        toolIcons.value = new Map(toolIcons.value)
      } catch (error) {
        console.warn(`获取工具 ${tool.name || tool.description} 图标失败:`, error)
        toolIcons.value.set(tool.id, '/default-icon.svg')
      }
    }
  }, 0)
}

// 添加工具
const addTool = async () => {
  if (!toolFormRef.value) return
  
  try {
    const valid = await toolFormRef.value.validate()
    if (!valid) return
    
    // 验证必填字段
    if (!newTool.url || !newTool.name || !newTool.description) {
      throw new Error('名称、描述和URL为必填字段')
    }

    // 验证URL格式
    if (!isValidUrl(newTool.url)) {
      throw new Error('请输入有效的URL地址')
    }
    
    adding.value = true
    
    // 构建H5Stats对象
    const h5StatsData = {
      name: newTool.name,
      url: newTool.url,
      description: newTool.description
      // 不再包含api字段，因为API现在通过列表单独处理
    }
    
    // 过滤空的API地址
    const filteredApiList = newTool.apiList.filter(api => api.trim() !== '')
    
    const response = await insertH5Url(h5StatsData, filteredApiList)
    
    if (response.status === '200') {
      ElMessage.success('添加工具成功')
      showAddDialog.value = false
      resetForm()
      await fetchTools() // 重新获取列表
    } else {
      throw new Error(response.message || '添加工具失败')
    }
  } catch (error) {
    console.error('添加工具失败:', error)
    ElMessage.error(error.message || '添加工具失败，请检查网络连接')
  } finally {
    adding.value = false
  }
}

// 编辑工具
const editTool = (tool) => {
  editingTool.id = tool.id
  editingTool.name = tool.name || ''
  editingTool.description = tool.description || ''
  editingTool.url = tool.url || ''
  editingTool.originalUrl = tool.url || '' // 保存原始URL
  
  // 处理API列表，如果tool.api是字符串，转换为数组
  if (tool.api) {
    if (Array.isArray(tool.api)) {
      editingTool.apiList = [...tool.api]
    } else {
      editingTool.apiList = [tool.api]
    }
  } else {
    editingTool.apiList = ['']
  }
  
  showEditDialog.value = true
}

// 更新工具
const updateTool = async () => {
  if (!editFormRef.value) return
  
  try {
    const valid = await editFormRef.value.validate()
    if (!valid) return
    
    // 验证必填字段
    if (!editingTool.url || !editingTool.name || !editingTool.description) {
      throw new Error('名称、描述和URL为必填字段')
    }

    // 验证URL格式
    if (!isValidUrl(editingTool.url)) {
      throw new Error('请输入有效的URL地址')
    }
    
    updating.value = true
    
    // 构建H5Stats对象
    const h5StatsData = {
      id: editingTool.id,
      name: editingTool.name,
      url: editingTool.url,  // 新的URL
      description: editingTool.description
      // 不再包含api字段，因为API现在通过列表单独处理
    }
    
    // 过滤空的API地址
    const filteredApiList = editingTool.apiList.filter(api => api.trim() !== '')
    
    const response = await updateH5Url(editingTool.originalUrl, editingTool.url, filteredApiList, h5StatsData)
    
    if (response.status === '200') {
      ElMessage.success('更新工具成功')
      showEditDialog.value = false
      resetEditForm()
      await fetchTools() // 重新获取列表
    } else {
      throw new Error(response.message || '更新工具失败')
    }
  } catch (error) {
    console.error('更新工具失败:', error)
    ElMessage.error(error.message || '更新工具失败，请检查网络连接')
  } finally {
    updating.value = false
  }
}

// 删除工具
const deleteTool = async (tool) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除工具 "${tool.name || tool.description}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const response = await deleteH5Url(tool.url)
    
    if (response.status === '200') {
      ElMessage.success('删除工具成功')
      await fetchTools() // 重新获取列表
    } else {
      throw new Error(response.message || '删除工具失败')
    }
  } catch (error) {
    if (error === 'cancel') {
      ElMessage.info('已取消删除')
    } else {
      console.error('删除工具失败:', error)
      ElMessage.error(error.message || '删除工具失败，请检查网络连接')
    }
  }
}

// 打开工具
const openTool = (tool) => {
  openUrl(tool.url)
}

// 为每个工具获取独特的图标（不使用域名缓存）
const getUniqueToolIcon = async (url) => {
  if (!url) return '/default-icon.svg'
  
  try {
    // 处理没有协议的URL
    let fullUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url
    }
    
    const urlObj = new URL(fullUrl)
    console.log(`解析URL: ${url} -> ${fullUrl} -> hostname: ${urlObj.hostname}`)
    const faviconUrls = [
      // 1. 使用Google的favicon服务（最可靠）
      `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`,
      
      // 2. 使用iconhorse服务
      `https://icon.horse/icon/${urlObj.hostname}`,
      
      // 3. 标准favicon.ico路径
      `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`,
      
      // 4. 使用favicon.io服务
      `https://favicons.githubusercontent.com/${urlObj.hostname}`,
      
      // 5. 备用方案
      '/default-icon.svg'
    ]
    
    // 尝试每个图标源
    for (const faviconUrl of faviconUrls) {
      try {
        const isAvailable = await checkImageAvailability(faviconUrl, 3000)
        if (isAvailable) {
          return faviconUrl
        }
      } catch (error) {
        console.warn(`图标检查失败: ${faviconUrl}`, error)
        continue
      }
    }
    
    return '/default-icon.svg'
  } catch (error) {
    console.warn('获取图标失败:', error)
    return '/default-icon.svg'
  }
}

// 图标可用性检查（增加超时控制）
const checkImageAvailability = (imageUrl, timeout = 3000) => {
  return new Promise((resolve) => {
    const img = new Image()
    let isResolved = false
    
    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        img.src = '' // 清空src以停止加载
        resolve(false)
      }
    }, timeout)
    
    img.onload = () => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timer)
        resolve(true)
      }
    }
    
    img.onerror = () => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timer)
        resolve(false)
      }
    }
    
    img.src = imageUrl
  })
}

// 获取图标
const getToolIcon = (tool) => {
  return toolIcons.value.get(tool.id) || '/default-icon.svg'
}

// 处理图标加载错误
const handleIconError = (event) => {
  event.target.src = '/default-icon.svg'
}

// 预览图标
const previewIcon = () => {
  // 当URL输入完成时，触发图标预览
  // 这里可以添加额外的图标预览逻辑
}

// 格式化URL显示
const formatUrl = (url) => {
  return formatDisplayUrl(url)
}

// 重置表单
const resetForm = () => {
  newTool.name = ''
  newTool.url = ''
  newTool.description = ''
  newTool.apiList = [''] // 重置为包含一个空字符串的数组
  if (toolFormRef.value) {
    toolFormRef.value.clearValidate()
  }
}

// 重置编辑表单
const resetEditForm = () => {
  editingTool.id = null
  editingTool.name = ''
  editingTool.url = ''
  editingTool.originalUrl = '' // 重置原始URL
  editingTool.description = ''
  editingTool.apiList = [''] // 重置为包含一个空字符串的数组
  if (editFormRef.value) {
    editFormRef.value.clearValidate()
  }
}

// 处理添加对话框关闭
const handleAddDialogClose = () => {
  showAddDialog.value = false
  resetForm()
}

// 处理编辑对话框关闭
const handleEditDialogClose = () => {
  showEditDialog.value = false
  resetEditForm()
}

// 获取预览图标
const getPreviewIcon = (url) => {
  if (!url) return '/default-icon.svg'
  return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`
}

// 组件挂载时获取数据
onMounted(() => {
  fetchTools()
})
</script>

<style scoped>
/* 全局弹窗样式 - 确保在最上层 */
.global-dialog {
  z-index: 9999 !important;
}

.global-dialog .el-dialog {
  z-index: 9999 !important;
}

.global-dialog .el-overlay {
  z-index: 9998 !important;
}

/* 主容器样式 - 复用ApiManagement的样式 */
.fp-tablecell {
  display: table-cell;
  vertical-align: middle;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

/* 玻璃半透明容器样式 */
.transparent-wrapper {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  margin: 60px 0 0 0; /* 增加顶部距离 */
  box-shadow: 
    0 8px 32px rgba(31, 38, 135, 0.37),
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 1400px;
  min-width: 1200px;
  min-height: 800px;
}

.transparent-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.8), 
    transparent);
}

.tools-grid-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 0;
  position: relative;
}

/* 头部样式 */
.management-header {
  text-align: center;
  margin-bottom: 48px;
  position: relative;
}

.management-header h1 {
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin-bottom: 16px;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.management-header p {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 24px;
  font-weight: 500;
}

.admin-controls {
  margin-top: 24px;
}

/* 工具网格 */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* 减小最小宽度从380px到300px，使用1fr让卡片自适应填充 */
  gap: 20px; /* 稍微减小间距以节省空间 */
  justify-content: center;
  margin-bottom: 40px;
}

/* 工具卡片玻璃效果 */
.tool-card {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 
    0 4px 16px rgba(31, 38, 135, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  min-height: 280px;
}

.tool-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.4), 
    transparent);
  transition: left 0.6s ease;
}

.tool-card:hover::before {
  left: 100%;
}

.tool-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 
    0 12px 32px rgba(31, 38, 135, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.6);
}

.tool-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
}

.tool-icon img {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
}

.tool-card:hover .tool-icon img {
  transform: scale(1.1);
}

.tool-info {
  text-align: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
}

.tool-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 12px;
  line-height: 1.3;
}

.tool-description {
  font-size: 1rem;
  color: #4b5563;
  margin-bottom: 12px;
  line-height: 1.5;
  font-weight: 500;
}

.tool-url {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 8px;
  font-weight: 500;
}

/* API列表容器样式 */
.api-list-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.api-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.api-input {
  flex: 1;
}

.remove-api-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-api-btn {
  align-self: flex-start;
  margin-top: 8px;
}

.tool-api-list {
  margin-top: 8px;
}

.tool-api {
  font-size: 0.85rem;
  color: #9ca3af;
  font-weight: 500;
  margin: 4px 0;
}

.tool-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  position: relative;
  z-index: 2;
}

.admin-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

/* 空状态优化 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  min-height: 500px; /* 增加空状态高度以匹配3张卡片的空间 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: rgba(255, 255, 255, 0.8);
}

/* 图标预览优化 */
.icon-preview {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.icon-preview img {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.no-icon {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

/* 按钮样式优化 */
:deep(.el-button) {
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 对话框样式优化 */
:deep(.el-dialog) {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

:deep(.el-dialog__header) {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}

/* 对话框遮罩层样式 */
:deep(.el-overlay) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .tools-grid {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 20px;
    max-width: 800px;
  }
  
  .transparent-wrapper {
    min-width: 800px; /* 中等屏幕下的最小宽度 */
    min-height: 650px; /* 中等屏幕下的3张卡片空间 */
  }
  
  .empty-state {
    min-height: 400px;
    padding: 60px 20px;
  }
}

@media (max-width: 768px) {
  .fp-tablecell {
    padding: 10px;
  }
  
  .transparent-wrapper {
    padding: 24px;
    border-radius: 20px;
    margin: 0;
    min-width: 100%; /* 小屏幕下使用全宽 */
    min-height: 600px; /* 小屏幕下单列3张卡片的空间 */
  }
  
  .tools-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    max-width: 100%;
  }
  
  .tools-header h1 {
    font-size: 2.2rem;
  }
  
  .tools-header p {
    font-size: 1.1rem;
  }
  
  .tool-card {
    padding: 24px;
    min-height: 240px;
  }
  
  .empty-state {
    min-height: 350px;
    padding: 50px 16px;
  }
  
  .admin-actions {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .transparent-wrapper {
    padding: 20px;
    border-radius: 16px;
    min-width: 100%; /* 超小屏幕下使用全宽 */
    min-height: 500px; /* 超小屏幕下3张卡片的空间 */
  }
  
  .tools-header h1 {
    font-size: 1.8rem;
  }
  
  .tool-card {
    padding: 20px;
    min-height: 200px;
  }
  
  .empty-state {
    min-height: 300px;
    padding: 40px 12px;
  }
  
  .tools-grid {
    gap: 12px;
  }
}
</style>