<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const wrapperId = 'live2d-wrapper-' + Math.random().toString(36).slice(2, 8)

// ===== 状态 =====
const panelVisible = ref(false)
const modelScale = ref(1.0)
const wrapperW = ref(300)
const wrapperH = ref(400)
const wrapperX = ref(null)
const wrapperY = ref(null)
const isDragging = ref(false)
let dragStartX = 0, dragStartY = 0, initialX = 0, initialY = 0

const chatInput = ref('')
const isChatVisible = ref(false)
const bubbleText = ref('')
const isTalking = ref(false)
const isThinking = ref(false)
const chatLoading = ref(false)
let thinkRafId = 0, talkRafId = 0, talkSafetyTimer = 0
let audioCtx = null, currentSource = null

const isResizing = ref(false)
let startX = 0, startY = 0, startW = 0, startH = 0

// ===== 工具 =====
function getPos(e) {
  const t = e.touches ? e.touches[0] : e
  return { x: t.clientX, y: t.clientY }
}

// ===== 缩放 =====
function onGripDown(e) {
  e.preventDefault(); e.stopPropagation()
  isResizing.value = true
  const p = getPos(e); startX = p.x; startY = p.y
  startW = wrapperW.value; startH = wrapperH.value
  document.addEventListener('pointermove', onGripMove)
  document.addEventListener('pointerup', onGripUp)
  document.addEventListener('touchmove', onGripMove, { passive: false })
  document.addEventListener('touchend', onGripUp)
}
function onGripMove(e) {
  if (!isResizing.value) return
  if (e.cancelable) e.preventDefault()
  const p = getPos(e)
  wrapperW.value = Math.max(150, Math.min(800, startW + p.x - startX))
  wrapperH.value = Math.max(200, Math.min(1000, startH + p.y - startY))
}
function onGripUp() {
  isResizing.value = false
  document.removeEventListener('pointermove', onGripMove)
  document.removeEventListener('pointerup', onGripUp)
  document.removeEventListener('touchmove', onGripMove)
  document.removeEventListener('touchend', onGripUp)
}

// ===== 拖动 =====
function onOuterDown(e) {
  if (e.target.closest('.resize-grip') || e.target.closest('.control-panel') ||
      e.target.closest('.chat-box') || e.target.closest('.chat-toggle-btn')) return
  e.preventDefault()
  isDragging.value = true
  const p = getPos(e); dragStartX = p.x; dragStartY = p.y
  if (wrapperX.value === null || wrapperY.value === null) {
    const rect = document.getElementById(wrapperId).getBoundingClientRect()
    wrapperX.value = rect.right - window.innerWidth
    wrapperY.value = rect.bottom - window.innerHeight
  }
  initialX = wrapperX.value; initialY = wrapperY.value
  document.addEventListener('pointermove', onOuterMove)
  document.addEventListener('pointerup', onOuterUp)
  document.addEventListener('touchmove', onOuterMove, { passive: false })
  document.addEventListener('touchend', onOuterUp)
}
function onOuterMove(e) {
  if (!isDragging.value) return
  if (e.cancelable) e.preventDefault()
  const p = getPos(e)
  wrapperX.value = initialX + (p.x - dragStartX)
  wrapperY.value = initialY + (p.y - dragStartY)
}
function onOuterUp() {
  isDragging.value = false
  document.removeEventListener('pointermove', onOuterMove)
  document.removeEventListener('pointerup', onOuterUp)
  document.removeEventListener('touchmove', onOuterMove)
  document.removeEventListener('touchend', onOuterUp)
}

// ===== 面板 & 缩放 =====
function togglePanel() { panelVisible.value = !panelVisible.value }
function setScale(v) {
  modelScale.value = Math.round(Math.max(0.3, Math.min(1, v)) * 100) / 100
  window.Live2DModel?.setScale(modelScale.value)
}

// ===== 动画参数叠加 =====
function applyAnimParams(t, api, intensity) {
  api.addParameterDelta('ParamAngleZ', 2 * intensity * Math.sin(t * 0.8))
  api.addParameterDelta('ParamEyeBallY', (0.4 + 0.2 * Math.sin(t * 1.2)) * intensity)
  api.addParameterDelta('ParamEyeBallX', 0.2 * intensity * Math.sin(t * 0.5))
  api.addParameterDelta('ParamBodyAngleX', -1.2 * intensity * Math.sin(t * 0.6))
}

// ===== 思考动画 =====
function startThinking() {
  isThinking.value = true
  if (thinkRafId) return
  function loop(now) {
    if (!isThinking.value) { thinkRafId = 0; return }
    const api = window.Live2DModel
    if (api?.addParameterDelta) applyAnimParams(now / 1000, api, 1)
    thinkRafId = requestAnimationFrame(loop)
  }
  thinkRafId = requestAnimationFrame(loop)
}
function stopThinking() {
  isThinking.value = false
  if (thinkRafId) { cancelAnimationFrame(thinkRafId); thinkRafId = 0 }
}

// ===== 说话效果 =====
function startTalkEffects() {
  if (talkRafId) return
  function loop(now) {
    if (!isTalking.value) { talkRafId = 0; return }
    const t = now / 1000
    const api = window.Live2DModel
    if (api?.addParameterDelta) {
      applyAnimParams(t, api, 0.7)
      api.addParameterDelta('ParamCheek', 0.4 + 0.2 * Math.sin(t * 2))
      api.addParameterDelta('ParamEyeLSmile', 0.2)
      api.addParameterDelta('ParamEyeRSmile', 0.2)
      api.addParameterDelta('ParamBrowLAngle', 0.2 * Math.abs(Math.sin(t * 3)))
      api.addParameterDelta('ParamBrowRAngle', 0.15 * Math.abs(Math.cos(t * 3.2)))
      api.addParameterDelta('ParamMouthOpenY', 0.3 * Math.abs(Math.sin(t * 4)))
      api.addParameterDelta('ParamBodyAngleX', 1.5 * Math.sin(t * 2))
    }
    talkRafId = requestAnimationFrame(loop)
  }
  talkRafId = requestAnimationFrame(loop)
  clearTimeout(talkSafetyTimer)
  talkSafetyTimer = setTimeout(() => stopTalkEffects(), 30000)
}
function stopTalkEffects() {
  isTalking.value = false
  clearTimeout(talkSafetyTimer)
  if (talkRafId) { cancelAnimationFrame(talkRafId); talkRafId = 0 }
}

// ===== 音频播放 =====
function playAudioWithSync(arrayBuf, replyText) {
  stopAudio()
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  audioCtx.decodeAudioData(arrayBuf.slice(0), (buf) => {
    currentSource = audioCtx.createBufferSource()
    currentSource.buffer = buf
    currentSource.connect(audioCtx.destination)
    currentSource.start(0)
    setTimeout(() => stopTalkEffects(), buf.duration * 1000 + 200)
  }, (err) => console.error('[Audio] decode error:', err))
  window.Live2DModel?.startTalkFromBytes?.(arrayBuf, replyText)
}
function stopAudio() {
  if (currentSource) { try { currentSource.stop() } catch (e) {} currentSource = null }
}

// ===== 对话 =====
function toggleChat() { isChatVisible.value = !isChatVisible.value }

async function sendMessage() {
  const prompt = chatInput.value.trim()
  if (!prompt || chatLoading.value) return
  chatLoading.value = true
  chatInput.value = ''
  bubbleText.value = ''
  startThinking()

  try {
    const llmRes = await fetch('https://muqingxi.com:2345/proxy/live2Dllm', {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: prompt
    })
    const llmData = await llmRes.json()
    const replyText = llmData.message || '抱歉，我无法回答这个问题。'
    stopThinking()

    try {
      const voiceRes = await fetch('https://muqingxi.com:2345/proxy/live2DVoice', {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: replyText
      })
      if (voiceRes.ok) {
        const arrayBuf = await (await voiceRes.blob()).arrayBuffer()
        bubbleText.value = replyText
        isTalking.value = true; startTalkEffects()
        playAudioWithSync(arrayBuf, replyText)
      } else {
        bubbleText.value = replyText
        isTalking.value = true; startTalkEffects()
        Live2DModel.startTalk('', replyText)
        setTimeout(() => stopTalkEffects(), 3000)
      }
    } catch {
      bubbleText.value = replyText
      isTalking.value = true; startTalkEffects()
      Live2DModel.startTalk('', replyText)
      setTimeout(() => stopTalkEffects(), 3000)
    }
  } catch (error) {
    console.error('对话接口调用失败:', error)
    stopThinking()
    bubbleText.value = '网络错误，请稍后再试。'
    setTimeout(() => { bubbleText.value = '' }, 2000)
  } finally {
    chatLoading.value = false
  }
}

// ===== 生命周期 =====
onMounted(() => {
  const t = setInterval(() => {
    if (!window.Live2DModel) return
    clearInterval(t)
    Live2DModel.onReady(() => {
      console.log('[Live2DPanel] 模型加载完成')
      Live2DModel.onTalkEnd(() => {
        stopTalkEffects()
        setTimeout(() => { bubbleText.value = '' }, 1500)
      })
    })
  }, 100)
})

onUnmounted(() => {
  stopThinking(); stopTalkEffects(); stopAudio()
  document.removeEventListener('pointermove', onGripMove)
  document.removeEventListener('pointerup', onGripUp)
  document.removeEventListener('touchmove', onGripMove)
  document.removeEventListener('touchend', onGripUp)
  document.removeEventListener('pointermove', onOuterMove)
  document.removeEventListener('pointerup', onOuterUp)
  document.removeEventListener('touchmove', onOuterMove)
  document.removeEventListener('touchend', onOuterUp)
})
</script>

<template>
  <div
    class="fixed z-[9999] select-none touch-none"
    :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
    :style="{
      width: wrapperW + 'px',
      right: wrapperX !== null ? (-wrapperX) + 'px' : '20px',
      bottom: wrapperY !== null ? (-wrapperY) + 'px' : '20px'
    }"
    @pointerdown="onOuterDown"
    @touchstart.passive="onOuterDown"
    @dblclick="togglePanel"
  >
    <!-- 气泡 -->
    <Transition name="bubble">
      <div v-if="bubbleText" class="bubble">
        <span class="bubble-arrow"></span>
        {{ bubbleText }}
      </div>
    </Transition>

    <!-- 模型包装器 -->
    <div
      :id="wrapperId"
      class="relative w-full overflow-hidden touch-none"
      :style="{ height: wrapperH + 'px', borderRadius: '24px' }"
    >
      <!-- Live2D 配置 -->
      <div
        class="live2d-config w-full h-full"
        data-cubism-model="https://www.muqingxi.com/Elysia"
        data-model-path="https://www.muqingxi.com/Elysia"
        data-show-background="false"
        data-shader-path="http://live2d.muqingxi.com/Framework/Shaders/WebGL/"
      ></div>

      <!-- 思考指示器 -->
      <Transition name="fade">
        <div v-if="isThinking && !bubbleText" class="think-indicator">
          <span class="think-dot think-dot-1"></span>
          <span class="think-dot think-dot-2"></span>
          <span class="think-dot think-dot-3"></span>
        </div>
      </Transition>

      <!-- 底部交互栏 -->
      <div class="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-3 pb-2.5 pt-8"
           style="background: linear-gradient(to top, rgba(0,0,0,0.15) 0%, transparent 100%);">

        <!-- 对话按钮 -->
        <button
          class="chat-toggle-btn"
          :class="{ active: isChatVisible }"
          @click.stop="toggleChat"
          title="对话"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        </button>

        <!-- 缩放手柄 -->
        <div class="resize-grip opacity-0 hover:opacity-60 transition-opacity duration-300
                    cursor-nwse-resize text-white/50"
             @pointerdown.stop="onGripDown"
             @touchstart.stop="onGripDown">
          <svg viewBox="0 0 14 14" width="12" height="12">
            <path d="M14 0v2L2 14H0l14-14zM14 4v2L6 14H4l10-10zM14 8v2l-4 4h-2l6-6zM14 12v2h-2l2-2z" fill="currentColor"/>
          </svg>
        </div>
      </div>

      <!-- 对话输入栏（从底部滑出） -->
      <Transition name="slideUp">
        <div v-if="isChatVisible" class="chat-box" @pointerdown.stop @touchstart.stop>
          <div class="chat-bar">
            <input
              v-model="chatInput"
              class="chat-input"
              placeholder="说点什么..."
              @keyup.enter="sendMessage"
              :disabled="chatLoading"
            />
            <button
              class="chat-send"
              :class="{ 'can-send': chatInput.trim() && !chatLoading }"
              @click="sendMessage"
              :disabled="chatLoading || !chatInput.trim()"
            >
              <svg v-if="!chatLoading" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
              <span v-else class="send-loading">
                <span></span><span></span><span></span>
              </span>
            </button>
          </div>
        </div>
      </Transition>

      <!-- 控制面板 -->
      <Transition name="panel">
        <div v-if="panelVisible" class="control-panel" @pointerdown.stop>
          <div class="panel-header">
            <span>设置</span>
            <button class="panel-close" @click="panelVisible = false">&times;</button>
          </div>
          <div class="panel-slider-row">
            <span class="text-white/50 text-[10px]">30%</span>
            <input type="range" min="30" max="100" class="panel-slider"
                   :value="Math.round(modelScale * 100)"
                   @input="setScale($event.target.value / 100)" />
            <span class="text-white/50 text-[10px]">100%</span>
          </div>
          <div class="text-center text-white/70 text-xs tabular-nums">
            {{ Math.round(modelScale * 100) }}%
          </div>
          <button class="panel-reset" @click="window.Live2DModel?.resetContainer(); setScale(1)">
            重置缩放
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style>
.live2d-config + canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  background: transparent;
  touch-action: none;
}
</style>

<style scoped>
/* ===== 气泡 ===== */
.bubble {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 14px;
  max-width: 220px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,240,245,0.95));
  backdrop-filter: blur(12px);
  color: #4a3548;
  font-size: 12.5px;
  line-height: 1.7;
  border-radius: 16px 16px 16px 4px;
  box-shadow:
    0 4px 20px rgba(233, 69, 96, 0.1),
    0 0 0 1px rgba(233, 69, 96, 0.08);
  word-break: break-word;
  white-space: pre-wrap;
  z-index: 50;
  pointer-events: none;
}
.bubble-arrow {
  position: absolute;
  bottom: -5px;
  left: 20px;
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, rgba(255,240,245,0.95), rgba(255,240,245,0.95));
  transform: rotate(45deg);
  border-radius: 0 0 2px 0;
  box-shadow: 2px 2px 4px rgba(233, 69, 96, 0.06);
}

/* ===== 思考指示器 ===== */
.think-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  z-index: 20;
  pointer-events: none;
}

/* ===== 对话按钮 ===== */
.chat-toggle-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.chat-toggle-btn:hover {
  background: rgba(233, 69, 96, 0.25);
  border-color: rgba(233, 69, 96, 0.4);
  color: white;
  transform: scale(1.08);
}
.chat-toggle-btn.active {
  background: rgba(233, 69, 96, 0.35);
  border-color: rgba(233, 69, 96, 0.5);
  color: white;
}
.chat-toggle-btn:active {
  transform: scale(0.95);
}

/* ===== 对话输入栏 ===== */
.chat-box {
  position: absolute;
  bottom: 44px;
  left: 0;
  right: 0;
  padding: 0 12px;
  z-index: 40;
}
.chat-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 14px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 22px;
}
.chat-input {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  color: white;
  font-size: 12.5px;
  outline: none;
  padding: 6px 0;
}
.chat-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
}
.chat-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.chat-send {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.chat-send.can-send {
  background: linear-gradient(135deg, #e94560, #ff6b8a);
  color: white;
  box-shadow: 0 2px 10px rgba(233, 69, 96, 0.3);
}
.chat-send.can-send:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(233, 69, 96, 0.4);
}
.chat-send:disabled {
  cursor: not-allowed;
}
.chat-send:active:not(:disabled) {
  transform: scale(0.9);
}

/* 发送按钮加载动画 */
.send-loading {
  display: flex;
  gap: 3px;
  align-items: center;
}
.send-loading span {
  display: block;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  animation: sendPulse 1s ease-in-out infinite;
}
.send-loading span:nth-child(2) { animation-delay: 0.15s; }
.send-loading span:nth-child(3) { animation-delay: 0.3s; }

/* ===== 控制面板 ===== */
.control-panel {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 160px;
  padding: 12px;
  background: rgba(20, 10, 20, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: white;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 40;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  letter-spacing: 0.05em;
}
.panel-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}
.panel-close:hover { color: rgba(255, 255, 255, 0.8); }
.panel-slider-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.panel-slider {
  flex: 1;
  height: 2px;
  accent-color: #e94560;
  cursor: pointer;
}
.panel-reset {
  width: 100%;
  padding: 6px 0;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}
.panel-reset:hover {
  background: rgba(233, 69, 96, 0.15);
  border-color: rgba(233, 69, 96, 0.3);
  color: white;
}

/* ===== 思考点 ===== */
.think-dot {
  display: block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(233, 69, 96, 0.7);
  animation: thinkBounce 1.4s ease-in-out infinite;
}
.think-dot-1 { animation-delay: 0s; }
.think-dot-2 { animation-delay: 0.2s; }
.think-dot-3 { animation-delay: 0.4s; }

/* ===== 过渡动画 ===== */
.bubble-enter-active, .bubble-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.bubble-enter-from {
  opacity: 0;
  transform: translate(-50%, -100%) translateY(10px) scale(0.95);
}
.bubble-leave-to {
  opacity: 0;
  transform: translate(-50%, -100%) translateY(-6px) scale(0.95);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slideUp-enter-active, .slideUp-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.slideUp-enter-from, .slideUp-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.panel-enter-active, .panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.panel-enter-from, .panel-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-6px);
}

@keyframes thinkBounce {
  0%, 80%, 100% {
    opacity: 0.25;
    transform: translateY(0) scale(0.8);
  }
  40% {
    opacity: 1;
    transform: translateY(-5px) scale(1);
  }
}

@keyframes sendPulse {
  0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-2px); }
}
</style>
