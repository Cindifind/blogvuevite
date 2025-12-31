<template>
  <div class="fp-tablecell">
      <!-- 透明容器包裹整个页面 -->
      <div class="transparent-wrapper">
        <div class="api-management-container">
          <div class="management-header">
            <h1>API 管理中心</h1>
            <p>管理和维护系统API接口</p>
            
            <!-- 管理员添加API按钮 -->
            <div v-if="isAdmin" class="admin-controls">
              <el-button type="primary" @click="showAddDialog = true">
                <el-icon><Plus /></el-icon>
                添加API
              </el-button>
            </div>
          </div>

          <!-- API列表 -->
          <div class="apis-grid" v-loading="loading">
            <div 
              v-for="api in apis" 
              :key="api.id"
              class="api-card"
            >
              <div class="api-header">
                <h3 class="api-name">{{ api.url }}</h3>
                <div class="api-status">
                  <el-tag type="success">活跃</el-tag>
                </div>
              </div>
              
              <!-- API URL 显示 -->
              <div class="api-url-section" v-if="api.url">
                <div class="api-url">
                  <el-icon class="url-icon"><Link /></el-icon>
                  <span class="url-text">{{ api.url }}</span>
                </div>
              </div>
              
              <div class="api-info">
                <p class="api-description">{{ api.description || '暂无描述' }}</p>
                
                <!-- 代码示例预览 -->
                <div class="code-preview" v-if="api.java || api.python || api.javascript">
                  <div class="code-tabs">
                    <span v-if="api.java" class="code-tab">Java</span>
                    <span v-if="api.python" class="code-tab">Python</span>
                    <span v-if="api.javascript" class="code-tab">JavaScript</span>
                  </div>
                </div>
              </div>
              
              <div class="api-actions">
                <el-button size="small" type="info" @click="viewApiDetails(api)">
                  <el-icon><View /></el-icon>
                  查看详情
                </el-button>
                <!-- 管理员操作按钮 -->
                <div v-if="isAdmin" class="admin-actions">
                  <el-button size="small" type="warning" @click="editApi(api)">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button size="small" type="danger" @click="deleteApi(api)">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!loading && apis.length === 0" class="empty-state">
            <el-empty description="暂无API">
              <el-button v-if="isAdmin" type="primary" @click="showAddDialog = true">
                添加第一个API
              </el-button>
            </el-empty>
          </div>

        </div>
      </div>
  </div>

  <!-- 弹窗组件移到fp-tablecell外部 -->
  <!-- 添加API对话框 -->
  <el-dialog
    v-model="showAddDialog"
    title="添加新API"
    width="600px"
    :before-close="handleAddDialogClose"
    class="global-dialog"
  >
    <el-form :model="newApi" :rules="apiRules" ref="apiFormRef" label-width="100px">
      <el-form-item label="API URL" prop="url">
        <el-input 
          v-model="newApi.url" 
          placeholder="请输入完整的URL或路径（如 /proxy/xxx）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>
  
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleAddDialogClose">取消</el-button>
        <el-button type="primary" @click="addApi" :loading="adding">
          添加
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 编辑API对话框 -->
  <el-dialog
    v-model="showEditDialog"
    title="编辑API"
    width="600px"
    :before-close="handleEditDialogClose"
    class="global-dialog"
  >
    <el-form :model="editingApi" :rules="apiRules" ref="editFormRef" label-width="100px">
      <el-form-item label="API URL" prop="url">
        <el-input 
          v-model="editingApi.url" 
          placeholder="请输入完整的URL或路径（如 /proxy/xxx）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="API描述" prop="description">
        <el-input 
          v-model="editingApi.description" 
          placeholder="请输入API描述"
          maxlength="200"
          show-word-limit
          type="textarea"
          :rows="3"
        />
      </el-form-item>
      <el-form-item label="Java代码">
        <el-input 
          v-model="editingApi.java" 
          placeholder="请输入Java示例代码"
          type="textarea"
          :rows="4"
        />
      </el-form-item>
      <el-form-item label="Python代码">
        <el-input 
          v-model="editingApi.python" 
          placeholder="请输入Python示例代码"
          type="textarea"
          :rows="4"
        />
      </el-form-item>
      <el-form-item label="JavaScript代码">
        <el-input 
          v-model="editingApi.javascript" 
          placeholder="请输入JavaScript示例代码"
          type="textarea"
          :rows="4"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleEditDialogClose">取消</el-button>
        <el-button type="primary" @click="updateApi" :loading="updating">
          更新
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- API详情对话框 -->
  <el-dialog
    v-model="showDetailsDialog"
    title="API详情"
    width="800px"
    class="global-dialog"
  >
    <div v-if="selectedApi" class="api-details">
      <div class="detail-section">
        <h3>基本信息</h3>
        <p><strong>API URL：</strong>{{ selectedApi.url }}</p>
        <p><strong>描述：</strong>{{ selectedApi.description || '暂无描述' }}</p>
      </div>
      
      <div class="detail-section" v-if="selectedApi.java">
        <h3>Java代码示例</h3>
        <pre class="code-block"><code>{{ selectedApi.java }}</code></pre>
      </div>
      
      <div class="detail-section" v-if="selectedApi.python">
        <h3>Python代码示例</h3>
        <pre class="code-block"><code>{{ selectedApi.python }}</code></pre>
      </div>
      
      <div class="detail-section" v-if="selectedApi.javascript">
        <h3>JavaScript代码示例</h3>
        <pre class="code-block"><code>{{ selectedApi.javascript }}</code></pre>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Link, View, Edit, Delete } from '@element-plus/icons-vue'
import { useAuth } from '../composables/useAuth'

// 认证与管理员判断（复用 H5Tools 的写法风格）
const { isLoggedIn, userInfo } = useAuth()
const isAdmin = computed(() => isLoggedIn.value && userInfo.value?.grade === 3)

// 响应式状态
const apis = ref([])
const loading = ref(false)
const adding = ref(false)
const updating = ref(false)
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const showDetailsDialog = ref(false)
const apiFormRef = ref(null)
const editFormRef = ref(null)
const selectedApi = ref(null)

// 新增与编辑表单数据
const newApi = reactive({
  url: ''
})

const editingApi = reactive({
  originalUrl: '',
  url: '',
  description: '',
  java: '',
  python: '',
  javascript: ''
})

// 表单验证规则（与模板字段对应）
const apiRules = {
  url: [
    { required: true, message: '请输入API URL', trigger: 'blur' },
    { min: 1, max: 200, message: '长度在 1 到 200 个字符', trigger: 'blur' }
  ],
  // 描述可选，不强制校验
}

// 基础配置与通用请求
const API_BASE_URL = 'https://luren.online:2345'
const getToken = () => localStorage.getItem('userToken')

const request = async (url, options = {}, requireAuth = false) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (requireAuth) {
      const token = getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, { headers, ...options })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('API请求失败:', error)
    throw error
  }
}

// 后端接口封装（参照给定接口）
const getApiStats = async () => {
  // 后端返回的是 List<ApiStats>，无需status包装
  return await request(`${API_BASE_URL}/proxy/apiStats`, { method: 'GET' })
}

const insertApiUrl = async (url) => {
  // 采用查询参数方式以兼容未使用 @RequestBody 的后端方法签名
  const fullUrl = `${API_BASE_URL}/proxy/insertApiUrl?url=${encodeURIComponent(url)}`
  return await request(fullUrl, { method: 'POST' }, true)
}

const updateApiUrl = async (url, description, java, python, javascript) => {
  const qs = new URLSearchParams({
    url: url || '',
    description: description || '',
    java: java || '',
    python: python || '',
    javascript: javascript || ''
  }).toString()
  const fullUrl = `${API_BASE_URL}/proxy/updateApiUrl?${qs}`
  return await request(fullUrl, { method: 'POST' }, true)
}

const deleteApiUrl = async (url) => {
  const fullUrl = `${API_BASE_URL}/proxy/deleteApi?url=${encodeURIComponent(url)}`
  return await request(fullUrl, { method: 'POST' }, true)
}

// 加载API列表
const fetchApis = async () => {
  loading.value = true
  try {
    const data = await getApiStats()
    if (Array.isArray(data)) {
      apis.value = data
    } else if (data && data.status === '200') {
      apis.value = data.data || []
    } else {
      apis.value = []
    }
  } catch (error) {
    console.error('获取API列表失败:', error)
    ElMessage.error(error.message || '获取API列表失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 新增API
const addApi = async () => {
  if (!apiFormRef.value) return
  try {
    const valid = await apiFormRef.value.validate()
    if (!valid) return

    if (!newApi.url) throw new Error('API URL为必填字段')

    adding.value = true
    const resp = await insertApiUrl(newApi.url)

    if (resp && (resp.status === '200' || resp.message === '插入成功')) {
      ElMessage.success('添加API成功')
      showAddDialog.value = false
      resetAddForm()
      await fetchApis()
    } else {
      throw new Error(resp?.message || '添加API失败')
    }
  } catch (error) {
    console.error('添加API失败:', error)
    ElMessage.error(error.message || '添加API失败，请检查网络连接')
  } finally {
    adding.value = false
  }
}

// 编辑（打开对话框并回填数据）
const editApi = (api) => {
  editingApi.originalUrl = api.url || ''
  editingApi.url = api.url || ''
  editingApi.description = api.description || ''
  editingApi.java = api.java || ''
  editingApi.python = api.python || ''
  editingApi.javascript = api.javascript || ''
  showEditDialog.value = true
}

// 更新API（注意：当前后端接口不支持修改URL本身）
const updateApi = async () => {
  if (!editFormRef.value) return
  try {
    const valid = await editFormRef.value.validate()
    if (!valid) return

    if (!editingApi.originalUrl) throw new Error('未找到原始URL，无法更新')

    updating.value = true
    const resp = await updateApiUrl(
      editingApi.originalUrl,
      editingApi.description,
      editingApi.java,
      editingApi.python,
      editingApi.javascript
    )

    if (resp && (resp.status === '200' || resp.message === '更新成功')) {
      ElMessage.success('更新API成功')
      showEditDialog.value = false
      resetEditForm()
      await fetchApis()
    } else {
      throw new Error(resp?.message || '更新API失败')
    }
  } catch (error) {
    console.error('更新API失败:', error)
    ElMessage.error(error.message || '更新API失败，请检查网络连接')
  } finally {
    updating.value = false
  }
}

// 删除API
const deleteApi = async (api) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除API \"${api.url}\" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const resp = await deleteApiUrl(api.url)
    if (resp && (resp.status === '200' || resp.message === '删除成功')) {
      ElMessage.success('删除API成功')
      await fetchApis()
    } else {
      throw new Error(resp?.message || '删除API失败')
    }
  } catch (error) {
    if (error === 'cancel') {
      ElMessage.info('已取消删除')
    } else {
      console.error('删除API失败:', error)
      ElMessage.error(error.message || '删除API失败，请检查网络连接')
    }
  }
}

// 查看详情
const viewApiDetails = (api) => {
  selectedApi.value = api
  showDetailsDialog.value = true
}

// 关闭对话框与重置函数
const handleAddDialogClose = () => {
  showAddDialog.value = false
  resetAddForm()
}

const handleEditDialogClose = () => {
  showEditDialog.value = false
  resetEditForm()
}

const resetAddForm = () => {
  newApi.url = ''
  apiFormRef.value?.resetFields?.()
}

const resetEditForm = () => {
  editingApi.originalUrl = ''
  editingApi.url = ''
  editingApi.description = ''
  editingApi.java = ''
  editingApi.python = ''
  editingApi.javascript = ''
  editFormRef.value?.resetFields?.()
}

onMounted(() => {
  fetchApis()
})
</script>

<style scoped>
/* 主容器样式 - 复用H5Tools的样式 */
.fp-tablecell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
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
  margin: 0;
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

.api-management-container {
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

/* API网格 */
.apis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 380px));
  gap: 24px;
  justify-content: center;
  margin-bottom: 40px;
}

/* API卡片样式 */
.api-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 8px 32px rgba(31, 38, 135, 0.37),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  height: 280px;
  display: flex;
  flex-direction: column;
}

.api-card:hover {
  transform: translateY(-8px);
  box-shadow: 
    0 20px 40px rgba(31, 38, 135, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.api-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.api-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.api-status {
  flex-shrink: 0;
}

/* API URL 显示样式 */
.api-url-section {
  margin-bottom: 16px;
}

.api-url {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.url-icon {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  flex-shrink: 0;
}

.url-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
  font-weight: 500;
  word-break: break-all;
}

.api-info {
  flex: 1;
  margin-bottom: 20px;
}

.api-description {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.code-preview {
  margin-top: 12px;
}

.code-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.code-tab {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
}

.api-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}

.admin-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.8);
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 对话框定位和样式优化 - 浏览器视口正中央 */
:deep(.el-overlay) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background-color: transparent !important;
  z-index: 2000 !important;
  pointer-events: none !important;
}

:deep(.el-overlay-dialog) {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: auto !important;
  z-index: 2001 !important;
}

:deep(.el-dialog) {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
  margin: 0 !important;
  padding: 0 !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  max-height: 80vh !important;
  overflow: hidden !important;
  width: auto !important;
  min-width: 500px !important;
  max-width: 90vw !important;
  display: flex !important;
  flex-direction: column !important;
}

:deep(.el-dialog__header) {
  padding: 24px 24px 16px 24px !important;
  border-bottom: 1px solid #ebeef5 !important;
  flex-shrink: 0 !important;
  background: rgba(255, 255, 255, 0.9) !important;
}

:deep(.el-dialog__body) {
  padding: 24px !important;
  flex: 1 !important;
  overflow-y: auto !important;
  max-height: 60vh !important;
  background: rgba(255, 255, 255, 0.9) !important;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px 24px 24px !important;
  border-top: 1px solid #ebeef5 !important;
  flex-shrink: 0 !important;
  background: rgba(255, 255, 255, 0.9) !important;
}

/* 确保对话框标题样式 */
:deep(.el-dialog__title) {
  color: #333 !important;
  font-weight: 600 !important;
  font-size: 1.3rem !important;
}

/* 确保关闭按钮样式 */
:deep(.el-dialog__close) {
  color: #666 !important;
  font-size: 1.4rem !important;
  transition: color 0.3s ease !important;
}

:deep(.el-dialog__close:hover) {
  color: #333 !important;
}

/* 响应式对话框样式 */
@media (max-width: 768px) {
  :deep(.el-dialog) {
    min-width: auto !important;
    max-width: 95vw !important;
    max-height: 90vh !important;
  }
  
  :deep(.el-dialog__header) {
    padding: 20px 20px 12px 20px !important;
  }
  
  :deep(.el-dialog__body) {
    padding: 20px !important;
    max-height: 70vh !important;
  }
  
  :deep(.el-dialog__footer) {
    padding: 12px 20px 20px 20px !important;
  }
}

/* API详情样式 */
.api-details {
  max-height: none !important;
  overflow: visible !important;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h3 {
  color: #409eff;
  margin-bottom: 12px;
  font-size: 1.1rem;
}

.detail-section p {
  margin-bottom: 8px;
  line-height: 1.6;
}

.code-block {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #333;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .transparent-wrapper {
    min-width: 800px;
    padding: 30px;
  }
  
  .apis-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }
  
  .management-header h1 {
    font-size: 2.5rem;
  }
}

@media (max-width: 768px) {
  .transparent-wrapper {
    min-width: auto;
    padding: 20px;
    margin: 10px;
  }
  
  .apis-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .api-card {
    height: auto;
    min-height: 240px;
  }
  
  .management-header h1 {
    font-size: 2rem;
  }
  
  .admin-actions {
    margin-left: 0;
    margin-top: 8px;
  }
}

/* 全局对话框样式 - 确保对话框显示在最顶层 */
.global-dialog {
  z-index: 9999 !important;
}

.global-dialog .el-dialog {
  z-index: 9999 !important;
}

.global-dialog .el-overlay {
  z-index: 9998 !important;
}
</style>