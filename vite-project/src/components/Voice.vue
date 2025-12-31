<!-- src/components/Voice.vue -->
<template>
  <div class="voice-component">
    <div class="container">
      <h1>Elysia 语音生成</h1>

      <div v-if="!isAuthenticated" class="message error">
        <p>请先登录以使用此功能</p>
        <button @click="goToLogin" class="btn">前往登录</button>
      </div>

      <div v-else>
        <div id="error-message" class="message error" v-if="errorMessage">
          {{ errorMessage }}
        </div>
        <div id="success-message" class="message success" v-if="successMessage">
          {{ successMessage }}
        </div>

        <div id="voice-form" v-show="!isLoading && !audioUrl">
          <div class="form-group">
            <label for="text-input">输入文本:</label>
            <textarea
                id="text-input"
                v-model="inputText"
                placeholder="请输入要转换为语音的文本..."
                :disabled="isLoading">
            </textarea>
          </div>

          <button
              id="generate-btn"
              class="btn"
              @click="generateVoice"
              :disabled="isLoading || !inputText.trim()">
            {{ isLoading ? '生成中...' : '生成语音' }}
          </button>
        </div>

        <div id="loading" class="loading" v-show="isLoading">
          <div class="spinner"></div>
          <p>正在生成语音，请稍候...</p>
        </div>

        <div id="audio-player" class="audio-player" v-show="audioUrl">
          <audio
              ref="audioElement"
              :src="audioUrl"
              @timeupdate="updateProgress"
              @loadedmetadata="updateDuration"
              @ended="onAudioEnded">
          </audio>

          <div class="audio-controls">
            <button
                id="play-pause-btn"
                class="btn"
                @click="togglePlayPause">
              {{ isPlaying ? '暂停' : '播放' }}
            </button>

            <div class="volume-control">
              <label for="volume-slider">音量:</label>
              <input
                  type="range"
                  id="volume-slider"
                  class="slider"
                  min="0"
                  max="1"
                  step="0.01"
                  v-model="volume">
            </div>

            <button
                id="download-btn"
                class="btn btn-success"
                @click="downloadAudio">
              下载
            </button>

            <button
                id="reset-btn"
                class="btn btn-warning"
                @click="reset">
              重新生成
            </button>
          </div>

          <div class="progress-container">
            <div id="progress-bar" class="progress-bar" @click="setAudioTime">
              <div id="progress" class="progress" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <div class="time">
              <span id="current-time">{{ formatTime(currentTime) }}</span>
              <span id="duration">{{ formatTime(duration) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, watch, onMounted, onUnmounted} from 'vue'
import {useRouter} from 'vue-router'
import {useAuth} from '../composables/useAuth'

// 使用路由和认证
const router = useRouter()
const {isLoggedIn, token} = useAuth()

// 响应式数据
const inputText = ref('')
const isLoading = ref(false)
const audioUrl = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isPlaying = ref(false)
const volume = ref(1)
const currentTime = ref(0)
const duration = ref(0)
const progressPercent = ref(0)
const audioElement = ref(null)

// 计算属性
const isAuthenticated = computed(() => isLoggedIn.value)

// 方法
const goToLogin = () => {
  router.push('/login')
}

const formatTime = (seconds) => {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

const updateProgress = () => {
  if (audioElement.value) {
    currentTime.value = audioElement.value.currentTime
    progressPercent.value = (audioElement.value.currentTime / audioElement.value.duration) * 100
  }
}

const updateDuration = () => {
  if (audioElement.value) {
    duration.value = audioElement.value.duration
  }
}

const onAudioEnded = () => {
  isPlaying.value = false
}

const togglePlayPause = () => {
  if (!audioElement.value) return

  if (isPlaying.value) {
    audioElement.value.pause()
  } else {
    audioElement.value.play()
  }
  isPlaying.value = !isPlaying.value
}

const setAudioTime = (e) => {
  if (!audioElement.value) return

  const rect = e.target.getBoundingClientRect()
  const pos = (e.clientX - rect.left) / rect.width
  audioElement.value.currentTime = pos * audioElement.value.duration
}

const downloadAudio = () => {
  if (!audioUrl.value) return

  const text = inputText.value.trim()
  const filename = text.substring(0, 30).replace(/\s+/g, '_') || 'voice'

  const a = document.createElement('a')
  a.href = audioUrl.value
  a.download = `${filename}.mp3`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const reset = () => {
  // 重置状态
  audioUrl.value = ''
  isPlaying.value = false
  currentTime.value = 0
  duration.value = 0
  progressPercent.value = 0

  // 清除之前的音频对象URL以释放内存
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
}

const showError = (message) => {
  errorMessage.value = message
  setTimeout(() => {
    errorMessage.value = ''
  }, 5000)
}

const showSuccess = (message) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

const generateVoice = async () => {
  const text = inputText.value.trim()

  if (!text) {
    showError('请输入要转换为语音的文本')
    return
  }

  if (!token.value) {
    showError('认证失败，请重新登录')
    goToLogin()
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch('https://luren.online:2345/proxy/elysiaVoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`
      },
      body: JSON.stringify({text})
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const blob = await response.blob()
    audioUrl.value = URL.createObjectURL(blob)
    showSuccess('语音生成成功!')
  } catch (error) {
    console.error('生成语音时出错:', error)
    showError('生成语音失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 监听音量变化
watch(volume, (newVolume) => {
  if (audioElement.value) {
    audioElement.value.volume = newVolume
  }
})

// 组件挂载和卸载时的处理
onMounted(() => {
  // 如果用户未登录，自动跳转到登录页
  if (!isAuthenticated.value) {
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  }
})

onUnmounted(() => {
  // 清除音频对象URL以释放内存
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})
</script>

<style scoped>
.voice-component {
  padding: 20px;
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  max-width: 800px;
  width: 100%;
  background: var(--card-background, #ffffff);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 30px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: var(--primary-color, #409eff);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid var(--border-color, #dcdfe6);
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

textarea:focus {
  outline: none;
  border-color: var(--primary-color, #409eff);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.btn {
  display: inline-block;
  padding: 12px 24px;
  background-color: var(--primary-color, #409eff);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  transition: all 0.3s;
}

.btn:hover:not(:disabled) {
  opacity: 0.8;
  transform: translateY(-2px);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-success {
  background-color: var(--success-color, #67c23a);
}

.btn-warning {
  background-color: var(--warning-color, #e6a23c);
}

.btn-danger {
  background-color: var(--danger-color, #f56c6c);
}

.loading {
  text-align: center;
  padding: 20px;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--primary-color, #409eff);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.message {
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
}

.message.error {
  background-color: #fef0f0;
  color: var(--danger-color, #f56c6c);
  border: 1px solid var(--danger-color, #f56c6c);
}

.message.success {
  background-color: #f0f9ff;
  color: var(--success-color, #67c23a);
  border: 1px solid var(--success-color, #67c23a);
}

.audio-player {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid var(--border-color, #dcdfe6);
  border-radius: 4px;
  background-color: #fafafa;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-container {
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--border-color, #dcdfe6);
  border-radius: 3px;
  cursor: pointer;
  margin-bottom: 5px;
}

.progress {
  height: 100%;
  background: var(--primary-color, #409eff);
  border-radius: 3px;
  width: 0%;
}

.time {
  font-size: 12px;
  color: var(--text-secondary, #606266);
  display: flex;
  justify-content: space-between;
}

@media (max-width: 768px) {
  .container {
    padding: 15px;
  }

  .audio-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    width: 100%;
  }

  .volume-control {
    justify-content: space-between;
  }
}
</style>