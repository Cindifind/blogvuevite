<template>
  <div class="fp-tablecell">
    <div class="image-management-container">
      <h2>图片管理</h2>
      
      <!-- 上传区域 -->
      <div class="upload-section">
        <h3>上传图片</h3>
        <div class="upload-area">
          <input 
            type="file" 
            id="imageUpload" 
            @change="handleImageUpload" 
            accept="image/*"
            class="file-input"
          >
          <label for="imageUpload" class="upload-label">
            <div class="upload-content">
              <span class="upload-icon">📁</span>
              <span class="upload-text">选择图片文件</span>
              <span class="upload-hint">支持 JPG、PNG、GIF 等格式</span>
            </div>
          </label>
          
          <!-- 预览区域 -->
          <div v-if="uploadPreview" class="upload-preview">
            <img :src="uploadPreview" alt="预览图片" class="preview-image">
            <div class="preview-actions">
              <button @click="confirmUpload" :disabled="uploading" class="upload-btn">
                {{ uploading ? '上传中...' : '确认上传' }}
              </button>
              <button @click="cancelUpload" class="cancel-btn">取消</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 图片列表 -->
      <div class="images-section">
        <div class="section-header">
          <h3>图片列表</h3>
          <button @click="loadImageList" class="refresh-btn">🔄 刷新</button>
        </div>
        
        <!-- 加载状态 -->
        <div v-if="loading" class="loading">
          <p>加载中...</p>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error">
          <p>{{ error }}</p>
          <button @click="loadImageList">重试</button>
        </div>

        <!-- 空状态 -->
        <div v-else-if="imageList.length === 0" class="empty-state">
          <p>暂无图片</p>
        </div>

        <!-- 文件名列表 -->
        <div v-else class="filename-list">
          <div v-for="imageName in imageList" :key="imageName" class="filename-item">
            <div class="filename-content" @click="viewImage(imageName)">
              <span class="filename-text">{{ imageName }}</span>
              <span class="view-hint">点击查看</span>
            </div>
            <div class="filename-actions">
              <button @click="copyImageUrl(imageName)" class="action-btn copy-btn" title="复制链接">
                📋
              </button>
              <button @click="deleteImage(imageName)" class="action-btn delete-btn" title="删除">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 图片查看模态框 -->
      <div v-if="showImageModal" class="modal-overlay" @click="closeImageModal">
        <div class="image-modal" @click.stop>
          <div class="modal-header">
            <h3>{{ currentImageName }}</h3>
            <button @click="closeImageModal" class="close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <img :src="currentImageUrl" :alt="currentImageName" class="full-image">
            <div class="image-info">
              <p><strong>文件名:</strong> {{ currentImageName }}</p>
              <p><strong>访问链接:</strong> 
                <code class="url-code">{{ currentImageUrl }}</code>
                <button @click="copyImageUrl(currentImageName)" class="copy-url-btn">复制</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

// 用户状态管理
const userStore = useUserStore()

// 响应式数据
const imageList = ref([])
const loading = ref(false)
const error = ref(null)
const uploading = ref(false)

// 上传相关
const selectedFile = ref(null)
const uploadPreview = ref(null)

// 预览相关
const showImageModal = ref(false)
const currentImageName = ref('')
const currentImageUrl = ref('')

// 计算属性
const isLoggedIn = computed(() => userStore.isLoggedIn)

// API基础URL
const API_BASE_URL = 'https://muqingxi.com:8080'

// 获取图片列表
const loadImageList = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/getImageList`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    const data = await response.json()
    
    if (data.code === 200) {
      imageList.value = data.data || []
    } else {
      throw new Error(data.message || '获取图片列表失败')
    }
  } catch (err) {
    error.value = err.message
    ElMessage.error('获取图片列表失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

// 处理图片上传选择
const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      ElMessage.error('请选择图片文件')
      return
    }
    
    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      ElMessage.error('图片大小不能超过5MB')
      return
    }
    
    selectedFile.value = file
    
    // 生成预览
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadPreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 确认上传
const confirmUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择图片')
    return
  }
  
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }
  
  uploading.value = true
  
  try {
    const formData = new FormData()
    formData.append('image', selectedFile.value)
    
    const response = await fetch(`${API_BASE_URL}/admin/mdImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      },
      body: formData
    })
    
    const data = await response.json()
    
    if (data.code === 200) {
      ElMessage.success('图片上传成功')
      cancelUpload()
      await loadImageList()
    } else {
      throw new Error(data.message || '图片上传失败')
    }
  } catch (err) {
    ElMessage.error('图片上传失败: ' + err.message)
  } finally {
    uploading.value = false
  }
}

// 取消上传
const cancelUpload = () => {
  selectedFile.value = null
  uploadPreview.value = null
  document.getElementById('imageUpload').value = ''
}

// 删除图片
const deleteImage = async (imageName) => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }
  
  try {
    await ElMessageBox.confirm(`确定要删除图片 "${imageName}" 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await fetch(`${API_BASE_URL}/admin/deleteImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `mdImageName=${encodeURIComponent(imageName)}`
    })
    
    const data = await response.json()
    
    if (data.code === 200) {
      ElMessage.success('图片删除成功')
      await loadImageList()
    } else {
      throw new Error(data.message || '图片删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除图片失败: ' + err.message)
    }
  }
}

// 查看图片
const viewImage = (imageName) => {
  currentImageName.value = imageName
  currentImageUrl.value = getImageUrl(imageName)
  showImageModal.value = true
}

// 关闭图片查看模态框
const closeImageModal = () => {
  showImageModal.value = false
  currentImageName.value = ''
  currentImageUrl.value = ''
}

// 复制图片链接
const copyImageUrl = async (imageName) => {
  const imageUrl = getImageUrl(imageName)
  try {
    await navigator.clipboard.writeText(imageUrl)
    ElMessage.success('图片链接已复制到剪贴板')
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = imageUrl
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    ElMessage.success('图片链接已复制到剪贴板')
  }
}

// 获取图片URL
const getImageUrl = (imageName) => {
  return `${API_BASE_URL}/image?filename=${encodeURIComponent(imageName)}`
}

// 处理图片加载错误
const handleImageError = (event) => {
  // 避免循环加载：如果已经是默认图片了，就不再重新设置
  if (event.target.src.includes('default-article-image.jpg')) {
    console.warn('默认图片也加载失败，停止重试')
    // 设置一个透明的1x1像素图片作为最终fallback
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmNWY1ZjUiLz48L3N2Zz4='
    return
  }
  event.target.src = '/default-article-image.jpg'
}

// 组件挂载时加载数据
onMounted(async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后访问图片管理')
    return
  }
  
  await loadImageList()
})
</script>

<style scoped>
.image-management-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* 上传区域样式 */
.upload-section {
  margin-bottom: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.upload-area {
  margin-top: 15px;
}

.file-input {
  display: none;
}

.upload-label {
  display: block;
  padding: 40px 20px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  position: relative;
}

.upload-label:hover {
  border-color: #ff69b4;
  background: #fdf2f8;
}

.upload-label::after {
  content: '选择文件';
  position: absolute;
  top: 15px;
  right: 15px;
  background: #ff69b4;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
  min-width: 80px;
  text-align: center;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.upload-label:hover::after {
  background: #ff8ec7;
  transform: translateY(-1px);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 48px;
  color: #666;
}

.upload-text {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.upload-hint {
  font-size: 14px;
  color: #666;
}

.upload-preview {
  margin-top: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  text-align: center;
}

.preview-image {
  max-width: 300px;
  max-height: 200px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.upload-btn, .cancel-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.upload-btn {
  background-color: #007bff;
  color: white;
}

.upload-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.cancel-btn {
  background-color: #6c757d;
  color: white;
}

/* 图片列表样式 */
.images-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 20px;
}

.refresh-btn {
  padding: 8px 12px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.loading, .error, .empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* 文件名列表样式 */
.filename-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filename-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.filename-item:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}

.filename-content {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  flex: 1;
}

.filename-text {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.view-hint {
  font-size: 12px;
  color: #6c757d;
  font-style: italic;
}

.filename-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: white;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn {
  background-color: #28a745;
}

.delete-btn {
  background-color: #dc3545;
}

.action-btn:hover {
  opacity: 0.8;
}

/* 图片查看模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.image-modal {
  background: white;
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.close-btn {
  background: rgba(0, 0, 0, 0.1);
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: #666;
  width: 32px;
  height: 32px;
  border-radius: 50%;
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

.modal-body {
  padding: 20px;
  text-align: center;
}

.full-image {
  max-width: 100%;
  max-height: 60vh;
  border-radius: 4px;
}

.image-info {
  margin-top: 20px;
  text-align: left;
}

.url-code {
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.copy-url-btn {
  margin-left: 8px;
  padding: 4px 8px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .images-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }
  
  .image-actions {
    flex-direction: column;
    gap: 4px;
  }
  
  .action-btn {
    font-size: 11px;
    padding: 4px 8px;
  }
}
</style>