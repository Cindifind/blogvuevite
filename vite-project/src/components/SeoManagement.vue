<template>
  <div class="fp-tablecell">
    <div class="transparent-wrapper">
      <div class="seo-container">
        <div class="management-header">
          <h1>SEO 管理中心</h1>
          <p>管理和维护网站SEO页面信息</p>
          <div class="admin-controls">
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              添加SEO页面
            </el-button>
            <el-button type="success" @click="fetchSeoPages">
              <el-icon><Refresh /></el-icon>
              刷新列表
            </el-button>
          </div>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-value">{{ seoPages.length }}</div>
            <div class="stat-label">总页面数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ seoPages.filter(p => p.status === 1).length }}</div>
            <div class="stat-label">已启用</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ seoPages.filter(p => p.status === 0).length }}</div>
            <div class="stat-label">已停用</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ seoPages.reduce((sum, p) => sum + (p.crawlCount || 0), 0) }}</div>
            <div class="stat-label">总抓取次数</div>
          </div>
        </div>

        <!-- SEO页面表格 -->
        <div class="table-wrapper" v-loading="loading">
          <el-table
            :data="seoPages"
            style="width: 100%"
            stripe
            :header-cell-style="{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: '600' }"
            :cell-style="{ background: 'rgba(255,255,255,0.05)', color: '#eee' }"
            :row-class-name="tableRowClassName"
            empty-text="暂无SEO数据"
            max-height="600"
          >
            <el-table-column prop="urlPath" label="URL路径" min-width="160" show-overflow-tooltip />
            <el-table-column prop="title" label="页面标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="description" label="页面描述" min-width="200" show-overflow-tooltip />
            <el-table-column prop="ogType" label="OG类型" width="100" />
            <el-table-column prop="robots" label="Robots" width="140" show-overflow-tooltip />
            <el-table-column prop="sitemapPriority" label="Sitemap优先级" width="120" align="center" />
            <el-table-column prop="crawlCount" label="抓取次数" width="100" align="center" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right" align="center">
              <template #default="{ row }">
                <el-button size="small" type="info" @click="viewDetails(row)">
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button size="small" type="warning" @click="handleEdit(row)">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== 添加/编辑对话框 ==================== -->
  <el-dialog
    v-model="showFormDialog"
    :title="isEditing ? '编辑SEO页面' : '添加SEO页面'"
    width="900px"
    class="global-dialog"
    :before-close="handleDialogClose"
  >
    <el-form :model="formData" :rules="formRules" ref="formRef" label-width="120px" class="seo-form">
      <!-- 基本信息 -->
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <el-form-item label="URL路径" prop="urlPath">
          <el-input v-model="formData.urlPath" :disabled="isEditing" placeholder="如：/blog、/h5tools" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="页面标题" prop="title">
          <el-input v-model="formData.title" placeholder="建议60字符内" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="页面描述" prop="description">
          <el-input v-model="formData.description" placeholder="建议160字符内" maxlength="200" show-word-limit type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="页面关键词">
          <el-input v-model="formData.keywords" placeholder="逗号分隔，如：博客,技术,编程" maxlength="255" />
        </el-form-item>
        <el-form-item label="用户邮箱">
          <el-input v-model="formData.userEmail" placeholder="用户邮箱" maxlength="255" />
        </el-form-item>
      </div>

      <!-- 内容信息 -->
      <div class="form-section">
        <h3 class="section-title">内容信息</h3>
        <el-form-item label="纯文本内容">
          <el-input v-model="formData.contentText" type="textarea" :rows="3" placeholder="页面纯文本内容（供爬虫提取）" />
        </el-form-item>
        <el-form-item label="HTML内容">
          <el-input v-model="formData.contentHtml" type="textarea" :rows="3" placeholder="页面HTML内容（供爬虫渲染）" />
        </el-form-item>
        <el-form-item label="结构化数据">
          <el-input v-model="formData.structuredData" type="textarea" :rows="4" placeholder='JSON-LD格式，如：{"@context":"https://schema.org","@type":"WebSite"...}' />
        </el-form-item>
      </div>

      <!-- Open Graph 信息 -->
      <div class="form-section">
        <h3 class="section-title">Open Graph 信息</h3>
        <el-form-item label="OG标题">
          <el-input v-model="formData.ogTitle" placeholder="Open Graph标题" maxlength="120" />
        </el-form-item>
        <el-form-item label="OG描述">
          <el-input v-model="formData.ogDescription" placeholder="Open Graph描述" maxlength="200" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="OG图片URL">
          <el-input v-model="formData.ogImage" placeholder="Open Graph分享图片URL" maxlength="500" />
        </el-form-item>
        <el-form-item label="OG类型">
          <el-select v-model="formData.ogType" placeholder="请选择" style="width: 100%">
            <el-option label="website" value="website" />
            <el-option label="article" value="article" />
            <el-option label="profile" value="profile" />
            <el-option label="book" value="book" />
          </el-select>
        </el-form-item>
      </div>

      <!-- SEO配置 -->
      <div class="form-section">
        <h3 class="section-title">SEO 配置</h3>
        <el-form-item label="规范化URL">
          <el-input v-model="formData.canonicalUrl" placeholder="如：https://www.muqingxi.com/#/blog" maxlength="500" />
        </el-form-item>
        <el-form-item label="Robots指令">
          <el-select v-model="formData.robots" placeholder="请选择" style="width: 100%">
            <el-option label="index,follow" value="index,follow" />
            <el-option label="noindex,follow" value="noindex,follow" />
            <el-option label="index,nofollow" value="index,nofollow" />
            <el-option label="noindex,nofollow" value="noindex,nofollow" />
          </el-select>
        </el-form-item>
        <el-form-item label="Sitemap优先级">
          <el-slider v-model="sitemapPriorityNum" :min="0" :max="1" :step="0.1" show-input />
        </el-form-item>
        <el-form-item label="更新频率">
          <el-select v-model="formData.sitemapChangefreq" placeholder="请选择" style="width: 100%">
            <el-option label="always" value="always" />
            <el-option label="hourly" value="hourly" />
            <el-option label="daily" value="daily" />
            <el-option label="weekly" value="weekly" />
            <el-option label="monthly" value="monthly" />
            <el-option label="yearly" value="yearly" />
            <el-option label="never" value="never" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="formData.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleDialogClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEditing ? '更新' : '添加' }}
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- ==================== 详情对话框 ==================== -->
  <el-dialog
    v-model="showDetailDialog"
    title="SEO页面详情"
    width="800px"
    class="global-dialog"
  >
    <div v-if="detailData" class="detail-content">
      <div class="detail-grid">
        <div class="detail-item">
          <label>URL路径</label>
          <span>{{ detailData.urlPath }}</span>
        </div>
        <div class="detail-item">
          <label>页面标题</label>
          <span>{{ detailData.title || '-' }}</span>
        </div>
        <div class="detail-item">
          <label>OG类型</label>
          <span>{{ detailData.ogType || '-' }}</span>
        </div>
        <div class="detail-item">
          <label>Robots</label>
          <span>{{ detailData.robots || '-' }}</span>
        </div>
        <div class="detail-item">
          <label>Sitemap优先级</label>
          <span>{{ detailData.sitemapPriority || '-' }}</span>
        </div>
        <div class="detail-item">
          <label>更新频率</label>
          <span>{{ detailData.sitemapChangefreq || '-' }}</span>
        </div>
        <div class="detail-item">
          <label>状态</label>
          <el-tag :type="detailData.status === 1 ? 'success' : 'danger'" size="small">
            {{ detailData.status === 1 ? '启用' : '停用' }}
          </el-tag>
        </div>
        <div class="detail-item">
          <label>抓取次数</label>
          <span>{{ detailData.crawlCount || 0 }}</span>
        </div>
        <div class="detail-item full-width">
          <label>页面描述</label>
          <span>{{ detailData.description || '-' }}</span>
        </div>
        <div class="detail-item full-width">
          <label>关键词</label>
          <span>{{ detailData.keywords || '-' }}</span>
        </div>
        <div class="detail-item full-width">
          <label>OG标题</label>
          <span>{{ detailData.ogTitle || '-' }}</span>
        </div>
        <div class="detail-item full-width">
          <label>OG描述</label>
          <span>{{ detailData.ogDescription || '-' }}</span>
        </div>
        <div class="detail-item full-width">
          <label>OG图片</label>
          <span style="word-break: break-all;">{{ detailData.ogImage || '-' }}</span>
        </div>
        <div class="detail-item full-width">
          <label>规范化URL</label>
          <span style="word-break: break-all;">{{ detailData.canonicalUrl || '-' }}</span>
        </div>
        <div class="detail-item full-width">
          <label>纯文本内容</label>
          <div class="content-block">{{ detailData.contentText || '-' }}</div>
        </div>
        <div class="detail-item full-width">
          <label>HTML内容</label>
          <div class="content-block" v-html="detailData.contentHtml || '-'"></div>
        </div>
        <div class="detail-item full-width">
          <label>结构化数据</label>
          <pre class="json-block">{{ formatJson(detailData.structuredData) }}</pre>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, View, Edit, Delete, Refresh } from '@element-plus/icons-vue'
import { useAuth } from '../composables/useAuth'
import { authFetch } from '../utils/api'

// 认证
const { isLoggedIn, userInfo } = useAuth()

// API 基础地址
const API_BASE_URL = 'https://muqingxi.com:2345'

// 响应式状态
const seoPages = ref([])
const loading = ref(false)
const submitting = ref(false)
const showFormDialog = ref(false)
const showDetailDialog = ref(false)
const isEditing = ref(false)
const formRef = ref(null)
const detailData = ref(null)

// 表单数据
const formData = reactive({
  urlPath: '',
  title: '',
  description: '',
  keywords: '',
  contentText: '',
  contentHtml: '',
  structuredData: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  ogType: 'website',
  canonicalUrl: '',
  robots: 'index,follow',
  sitemapPriority: 0.5,
  sitemapChangefreq: 'weekly',
  status: 1,
  userEmail: ''
})

// Sitemap优先级用数字类型（el-slider需要number）
const sitemapPriorityNum = ref(0.5)

// 同步优先级值
const syncPriority = () => {
  formData.sitemapPriority = sitemapPriorityNum.value
}

// 表单验证规则
const formRules = {
  urlPath: [
    { required: true, message: '请输入URL路径', trigger: 'blur' },
    { min: 1, max: 255, message: '长度不能超过255个字符', trigger: 'blur' }
  ],
  title: [
    { required: true, message: '请输入页面标题', trigger: 'blur' },
    { max: 120, message: '标题不能超过120个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入页面描述', trigger: 'blur' },
    { max: 200, message: '描述不能超过200个字符', trigger: 'blur' }
  ]
}

// ==================== API 方法 ====================

// 获取当前用户的SEO页面列表
const fetchSeoPages = async () => {
  loading.value = true
  try {
    const response = await authFetch(`https://muqingxi.com:2345/proxy/selectSeo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    if (Array.isArray(data)) {
      seoPages.value = data
    } else if (data && Array.isArray(data.data)) {
      seoPages.value = data.data
    } else {
      seoPages.value = []
    }
  } catch (error) {
    console.error('获取SEO列表失败:', error)
    ElMessage.error('获取SEO列表失败: ' + error.message)
    seoPages.value = []
  } finally {
    loading.value = false
  }
}

// 新增SEO页面
const insertSeoPage = async (pageData) => {
  const response = await authFetch(`${API_BASE_URL}/proxy/seoPageInsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pageData)
  })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return await response.json()
}

// 更新SEO页面
const updateSeoPage = async (pageData) => {
  const response = await authFetch(`${API_BASE_URL}/proxy/seoPageUpdate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pageData)
  })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return await response.json()
}

// ==================== 交互方法 ====================

// 添加
const handleAdd = () => {
  isEditing.value = false
  resetForm()
  // 自动填入用户邮箱
  if (userInfo.value?.email) {
    formData.userEmail = userInfo.value.email
  }
  showFormDialog.value = true
}

// 编辑
const handleEdit = (row) => {
  isEditing.value = true
  Object.keys(formData).forEach(key => {
    if (key === 'sitemapPriority') {
      sitemapPriorityNum.value = parseFloat(row[key]) || 0.5
      formData[key] = sitemapPriorityNum.value
    } else if (key === 'status') {
      formData[key] = row[key] !== undefined ? row[key] : 1
    } else {
      formData[key] = row[key] || ''
    }
  })
  showFormDialog.value = true
}

// 查看详情
const viewDetails = (row) => {
  detailData.value = { ...row }
  showDetailDialog.value = true
}

// 删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除SEO页面 "${row.urlPath}" 吗？此操作不可恢复。`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    // 使用更新接口将 status 设为 0，is_deleted 设为 1（软删除）
    const deleteData = { ...row, isDeleted: 1, status: 0 }
    const resp = await updateSeoPage(deleteData)
    if (resp && (resp.result > 0 || resp.message === 'Update successful')) {
      ElMessage.success('删除成功')
      await fetchSeoPages()
    } else {
      throw new Error(resp?.message || '删除失败')
    }
  } catch (error) {
    if (error === 'cancel') {
      ElMessage.info('已取消删除')
    } else {
      console.error('删除SEO页面失败:', error)
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    // 同步优先级
    syncPriority()

    submitting.value = true
    const submitData = { ...formData }

    let resp
    if (isEditing.value) {
      resp = await updateSeoPage(submitData)
      if (resp && (resp.result > 0 || resp.message === 'Update successful')) {
        ElMessage.success('更新成功')
      } else {
        throw new Error(resp?.message || '更新失败')
      }
    } else {
      resp = await insertSeoPage(submitData)
      if (resp && (resp.result > 0 || resp.message === 'Insert successful')) {
        ElMessage.success('添加成功')
      } else {
        throw new Error(resp?.message || '添加失败')
      }
    }

    showFormDialog.value = false
    resetForm()
    await fetchSeoPages()
  } catch (error) {
    console.error('提交SEO数据失败:', error)
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 关闭对话框
const handleDialogClose = () => {
  showFormDialog.value = false
  resetForm()
}

// 重置表单
const resetForm = () => {
  Object.keys(formData).forEach(key => {
    if (key === 'ogType') formData[key] = 'website'
    else if (key === 'robots') formData[key] = 'index,follow'
    else if (key === 'sitemapChangefreq') formData[key] = 'weekly'
    else if (key === 'sitemapPriority') formData[key] = 0.5
    else if (key === 'status') formData[key] = 1
    else formData[key] = ''
  })
  sitemapPriorityNum.value = 0.5
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 表格行样式
const tableRowClassName = ({ row }) => {
  if (row.status === 0) return 'disabled-row'
  return ''
}

// 格式化JSON显示
const formatJson = (jsonStr) => {
  if (!jsonStr) return '-'
  try {
    if (typeof jsonStr === 'string') {
      return JSON.stringify(JSON.parse(jsonStr), null, 2)
    }
    return JSON.stringify(jsonStr, null, 2)
  } catch {
    return jsonStr
  }
}

// 初始化
onMounted(() => {
  fetchSeoPages()
})
</script>

<style scoped>
.fp-tablecell {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  position: relative;
  z-index: 1;
}

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
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
}

.seo-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 0;
  position: relative;
}

.management-header {
  text-align: center;
  margin-bottom: 40px;
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
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #4cdbff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8px;
}

/* 表格容器 */
.table-wrapper {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

:deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: transparent;
  --el-table-border-color: rgba(255, 255, 255, 0.15);
  --el-table-text-color: #eee;
  --el-table-header-text-color: #fff;
  --el-table-row-hover-bg-color: rgba(255, 255, 255, 0.1);
}

:deep(.el-table .disabled-row) {
  opacity: 0.5;
}

:deep(.el-table__empty-text) {
  color: rgba(255, 255, 255, 0.6);
}

/* 表单样式 */
.seo-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}

.form-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.form-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 16px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
}

/* 详情样式 */
.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item.full-width {
  grid-column: span 2;
}

.detail-item label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #909399;
}

.detail-item span {
  font-size: 0.95rem;
  color: #303133;
  line-height: 1.5;
}

.content-block {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  font-size: 0.9rem;
  color: #303133;
  max-height: 150px;
  overflow-y: auto;
  line-height: 1.5;
}

.json-block {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
  color: #303133;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-overlay) {
  position: fixed !important;
  top: 0; left: 0;
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
  top: auto; left: auto;
  transform: none !important;
  margin: 0 !important;
  padding: 0 !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(10px) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  max-height: 85vh !important;
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
  background: rgba(255, 255, 255, 0.9) !important;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px 24px 24px !important;
  border-top: 1px solid #ebeef5 !important;
  flex-shrink: 0 !important;
  background: rgba(255, 255, 255, 0.9) !important;
}

:deep(.el-dialog__title) {
  color: #333 !important;
  font-weight: 600 !important;
  font-size: 1.3rem !important;
}

:deep(.el-dialog__close) {
  color: #666 !important;
  font-size: 1.4rem !important;
}

/* 响应式 */
@media (max-width: 1200px) {
  .transparent-wrapper {
    min-width: auto;
    padding: 30px;
  }
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .management-header h1 {
    font-size: 2.5rem;
  }
}

@media (max-width: 768px) {
  .transparent-wrapper {
    padding: 20px;
    margin: 10px;
  }
  .stats-row {
    grid-template-columns: 1fr;
  }
  .management-header h1 {
    font-size: 2rem;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .detail-item.full-width {
    grid-column: span 1;
  }
}

/* 全局对话框样式 */
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

