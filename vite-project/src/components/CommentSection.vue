<template>
  <div class="comment-section">
    <div class="comment-header">
      <h3>评论 ({{ comments.length }})</h3>
    </div>

    <!-- 添加评论表单 -->
    <div class="add-comment" v-if="isLoggedIn">
      <form @submit.prevent="submitComment" class="comment-form">
        <div class="form-group">
          <textarea 
            v-model="newComment.content" 
            placeholder="写下你的评论..." 
            rows="4"
            class="comment-textarea"
            required
          ></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" :disabled="submitting" class="submit-btn">
            {{ submitting ? '发布中...' : '发布评论' }}
          </button>
        </div>
      </form>
    </div>

    <!-- 未登录提示 -->
    <div v-else class="login-prompt">
      <p>请登录后发表评论</p>
    </div>

    <!-- 评论列表 -->
    <div class="comments-list">
      <div v-if="loading" class="loading">
        <p>加载评论中...</p>
      </div>
      
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="loadComments" class="retry-btn">重试</button>
      </div>
      
      <div v-else-if="comments.length === 0" class="no-comments">
        <p>暂无评论，快来发表第一条评论吧！</p>
      </div>
      
      <div v-else>
        <!-- 主评论列表 -->
        <div 
          v-for="comment in comments" 
          :key="comment.timestamp" 
          class="comment-item"
        >
          <div class="comment-header-item">
            <div class="comment-author">
              <span class="author-name">{{ comment.email || '匿名用户' }}</span>
              <span class="comment-date">{{ formatDate(comment.timestamp) }}</span>
            </div>
            <div class="comment-actions" v-if="canDeleteComment(comment)">
              <button
                @click="deleteComment(comment.timestamp)"
                class="delete-btn"
                :disabled="deleting"
              >
                删除
              </button>
            </div>
          </div>
          <div class="comment-content">
            {{ comment.content }}
          </div>

          <!-- 主评论的回复和展开回复按钮 -->
          <div class="comment-actions-bar">
            <button @click="showReplyForm(comment)" class="reply-btn">
              回复
            </button>
            <button v-if="comment.reply !== 0" @click="toggleReplies(comment)" class="expand-replies-btn">
              {{ expandedReplies.has(comment.timestamp) ? '收起回复' : `展开回复(${comment.reply})` }}
            </button>
          </div>

          <!-- 回复表单 -->
          <div v-if="replyingTo === comment.timestamp" class="reply-form">
            <form @submit.prevent="submitReply(comment)" class="comment-form">
              <div class="form-group">
                <textarea
                  v-model="replyComment.content"
                  placeholder="写下你的回复..."
                  rows="3"
                  class="comment-textarea"
                  required
                ></textarea>
              </div>
              <div class="form-actions">
                <button type="button" @click="cancelReply" class="cancel-btn">取消</button>
                <button type="submit" :disabled="submitting" class="submit-btn">
                  {{ submitting ? '发布中...' : '发布回复' }}
                </button>
              </div>
            </form>
          </div>

          <!-- 子评论列表 -->
          <div v-if="expandedReplies.has(comment.timestamp)" class="replies-list">
            <!-- 加载指示器 -->
            <div v-if="loadingReplies.has(comment.timestamp)" class="loading-replies">
              <p>加载回复中...</p>
            </div>
            <!-- 回复列表 -->
            <div v-else-if="comment.replies && comment.replies.length > 0">
              <div
                v-for="reply in comment.replies"
                :key="reply.timestamp"
                class="reply-item"
              >
                <div class="reply-header">
                  <div class="reply-author">
                    <span class="author-name">{{ reply.email || '匿名用户' }}</span>
                    <span class="comment-date">{{ formatDate(reply.timestamp) }}</span>
                  </div>
                  <div class="comment-actions" v-if="canDeleteComment(reply)">
                    <button
                      @click="deleteComment(reply.timestamp)"
                      class="delete-btn"
                      :disabled="deleting"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div class="reply-content">
                  {{ reply.content }}
                </div>

                <!-- 子评论的回复按钮 -->
                <div class="reply-actions-bar">
                  <button @click="showReplyForm(reply)" class="reply-btn">
                    回复
                  </button>
                </div>

                <!-- 子评论的回复表单 -->
                <div v-if="replyingTo === reply.timestamp" class="reply-form nested-reply-form">
                  <form @submit.prevent="submitReply(reply)" class="comment-form">
                    <div class="form-group">
                      <textarea
                        v-model="replyComment.content"
                        placeholder="写下你的回复..."
                        rows="3"
                        class="comment-textarea"
                        required
                      ></textarea>
                    </div>
                    <div class="form-actions">
                      <button type="button" @click="cancelReply" class="cancel-btn">取消</button>
                      <button type="submit" :disabled="submitting" class="submit-btn">
                        {{ submitting ? '发布中...' : '发布回复' }}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <!-- 无回复提示 -->
            <div v-else class="no-replies">
              <p>暂无回复</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchWithToken } from '../utils/api'

// Props
const props = defineProps({
  articleId: {
    type: Number,
    required: true
  }
})

// 使用认证状态
const { isLoggedIn, userInfo, token } = useAuth()

// 响应式数据
const comments = ref([])
const loading = ref(false)
const error = ref('')
const submitting = ref(false)
const deleting = ref(false)
const replyingTo = ref(null) // 正在回复的评论ID
const expandedReplies = ref(new Set()) // 展开的回复列表
const loadingReplies = ref(new Set()) // 正在加载回复的评论ID

// 新评论表单
const newComment = reactive({
  content: ''
})

// 回复评论表单
const replyComment = reactive({
  content: ''
})

// 计算属性：检查是否可以删除评论
const canDeleteComment = computed(() => {
  return (comment) => {
    return isLoggedIn.value && userInfo.value?.email === comment.email
  }
})

// 方法：格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 方法：显示回复表单
const showReplyForm = (comment) => {
  replyingTo.value = comment.timestamp
  replyComment.content = ''
}

// 方法：取消回复
const cancelReply = () => {
  replyingTo.value = null
  replyComment.content = ''
}

// 方法：切换回复展开/收起状态
const toggleReplies = async (comment) => {
  const commentId = comment.timestamp;

  if (expandedReplies.value.has(commentId)) {
    // 如果已经展开，则收起
    expandedReplies.value.delete(commentId)
  } else {
    // 如果未展开，则展开并加载回复
    expandedReplies.value.add(commentId)

    // 如果还没有加载过回复，则调用接口加载
    if (!comment.replies || comment.replies.length === 0) {
      await loadReplies(comment)
    }
  }
}

// 方法：加载回复
const loadReplies = async (comment) => {
  const commentId = comment.timestamp;

  // 设置加载状态
  loadingReplies.value.add(commentId)

  try {
    // 调用 articleReply 接口获取回复
    const response = await fetchWithToken(`https://luren.online:2345/proxy/articleReply?parentId=${commentId}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.code === 200) {
      // 将回复数据存储到评论对象中
      comment.replies = result.data || []
    } else {
      throw new Error(result.message || '获取回复失败')
    }
  } catch (err) {
    console.error('加载回复失败:', err)
    ElMessage.error(err.message || '加载回复时发生错误')
  } finally {
    // 清除加载状态
    loadingReplies.value.delete(commentId)
  }
}

// 方法：加载评论
const loadComments = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await fetchWithToken(`https://luren.online:2345/proxy/article?articleId=${props.articleId}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.code === 200) {
      comments.value = result.data || []
    } else {
      throw new Error(result.message || '获取评论失败')
    }
  } catch (err) {
    console.error('加载评论失败:', err)
    error.value = err.message || '加载评论时发生错误'
  } finally {
    loading.value = false
  }
}

// 方法：提交评论
const submitComment = async () => {
  if (!newComment.content.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  submitting.value = true

  try {
    if (!token.value) {
      throw new Error('请先登录')
    }

    const commentData = {
      articleId: props.articleId,
      content: newComment.content.trim(),
      email: userInfo.value?.email,
      timestamp: Date.now()
    }

    const response = await fetchWithToken('https://luren.online:2345/proxy/addComment', {
      method: 'POST',
      body: JSON.stringify(commentData)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('评论发布成功')
      newComment.content = ''
      // 重新加载评论列表
      await loadComments()
    } else {
      throw new Error(result.message || '发布评论失败')
    }
  } catch (err) {
    console.error('发布评论失败:', err)
    ElMessage.error(err.message || '发布评论时发生错误')
  } finally {
    submitting.value = false
  }
}

// 方法：提交回复
const submitReply = async (parentComment) => {
  if (!replyComment.content.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }

  submitting.value = true

  try {
    if (!token.value) {
      throw new Error('请先登录')
    }

    // 调用 user/addReply 接口
    const response = await fetchWithToken(
      'https://luren.online:2345/proxy/addReply',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          articleId: props.articleId,
          content: replyComment.content.trim(),
          email: userInfo.value?.email,
          timestamp: Date.now(),
          parentId: parentComment.timestamp
        })
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('回复发布成功')
      replyingTo.value = null
      replyComment.content = ''
      // 重新加载评论列表
      await loadComments()

      // 如果之前展开了回复，重新加载回复列表
      if (expandedReplies.value.has(parentComment.timestamp)) {
        await loadReplies(parentComment)
      }
    } else {
      throw new Error(result.message || '发布回复失败')
    }
  } catch (err) {
    console.error('发布回复失败:', err)
    ElMessage.error(err.message || '发布回复时发生错误')
  } finally {
    submitting.value = false
  }
}

// 方法：删除评论
const deleteComment = async (timestamp) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    deleting.value = true

    if (!token.value) {
      throw new Error('请先登录')
    }

    const response = await fetchWithToken(`https://luren.online:2345/proxy/deleteComment?timestamp=${timestamp}`, {
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('评论删除成功')
      // 重新加载评论列表
      await loadComments()
    } else {
      throw new Error(result.message || '删除评论失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除评论失败:', err)
      ElMessage.error(err.message || '删除评论时发生错误')
    }
  } finally {
    deleting.value = false
  }
}

// 组件挂载时加载评论
onMounted(() => {
  loadComments()
})

// 暴露方法供父组件调用
defineExpose({
  loadComments
})
</script>

<style scoped>
.comment-section {
  margin-top: 40px;
  padding: 30px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.comment-header {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.comment-header h3 {
  color: #fff;
  font-size: 1.5rem;
  margin: 0;
  font-weight: 600;
}

/* 添加评论表单 */
.add-comment {
  margin-bottom: 30px;
}

.comment-form {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.form-group {
  margin-bottom: 15px;
}

.comment-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 100px;
  box-sizing: border-box;
}

.comment-textarea::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.comment-textarea:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.15);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.submit-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.cancel-btn {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 未登录提示 */
.login-prompt {
  text-align: center;
  padding: 20px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  margin-bottom: 30px;
}

.login-prompt p {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-size: 14px;
}

/* 评论列表 */
.comments-list {
  margin-top: 20px;
}

.loading, .error, .no-comments {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.7);
}

.error {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 8px;
}

.retry-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.no-comments {
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

/* 评论项 */
.comment-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 15px;
  transition: all 0.3s ease;
}

.comment-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
}

.comment-header-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 15px;
}

.author-name {
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.comment-date {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.comment-actions {
  display: flex;
  gap: 10px;
}

.delete-btn {
  padding: 4px 12px;
  background: rgba(220, 53, 69, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.delete-btn:hover:not(:disabled) {
  background: rgba(220, 53, 69, 1);
  transform: translateY(-1px);
}

.delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.comment-content {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  font-size: 14px;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 10px;
}

.comment-actions-bar {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.reply-btn, .expand-replies-btn {
  padding: 4px 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.reply-btn:hover, .expand-replies-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.5);
}

.reply-form {
  margin-top: 15px;
}

.reply-form .comment-form {
  background: rgba(255, 255, 255, 0.08);
  padding: 15px;
}

.reply-form.nested-reply-form {
  margin-left: 20px;
}

/* 回复列表 */
.replies-list {
  margin-top: 15px;
  padding-left: 20px;
  border-left: 2px solid rgba(255, 255, 255, 0.1);
}

.reply-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.reply-author {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reply-author .author-name {
  font-size: 13px;
}

.reply-author .comment-date {
  font-size: 11px;
}

.reply-content {
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
  font-size: 13px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.reply-actions-bar {
  margin-top: 10px;
}

.loading-replies, .no-replies {
  padding: 15px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .comment-section {
    padding: 20px;
    margin-top: 30px;
  }

  .comment-header-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .comment-author {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .comment-actions {
    align-self: flex-end;
  }

  .replies-list {
    padding-left: 10px;
  }

  .comment-actions-bar, .reply-actions-bar {
    flex-direction: column;
    gap: 5px;
  }

  .reply-form.nested-reply-form {
    margin-left: 10px;
  }
}
</style>