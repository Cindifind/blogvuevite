<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

// ===== 唯一 ID =====
const wrapperId = 'live2d-wrapper-' + Math.random().toString(36).slice(2, 8);

// ===== 状态 =====
const panelVisible = ref(false);
const modelScale    = ref(1.0);
const wrapperW      = ref(300);
const wrapperH      = ref(400);
const wrapperX      = ref(null);  // 使用null表示使用默认位置
const wrapperY      = ref(null);  // 使用null表示使用默认位置
const isDragging    = ref(false);
let dragStartX = 0, dragStartY = 0;
let initialX = 0, initialY = 0;

// ===== 缩放手柄 =====
const isResizing = ref(false);
let startX = 0, startY = 0, startW = 0, startH = 0;

function onGripDown(e) {
  e.preventDefault();
  e.stopPropagation();
  isResizing.value = true;
  startX = e.clientX; startY = e.clientY;
  startW = wrapperW.value; startH = wrapperH.value;
  document.addEventListener('pointermove', onGripMove);
  document.addEventListener('pointerup', onGripUp);
}

function onGripMove(e) {
  if (!isResizing.value) return;
  wrapperW.value = Math.max(150, Math.min(800, startW + e.clientX - startX));
  wrapperH.value = Math.max(200, Math.min(1000, startH + e.clientY - startY));
}

function onGripUp() {
  isResizing.value = false;
  document.removeEventListener('pointermove', onGripMove);
  document.removeEventListener('pointerup', onGripUp);
}

// ===== 拖动功能 =====
function onWrapperDown(e) {
  // 检查是否点击在缩放手柄或控制面板上，如果是则不进行拖动
  if (e.target.classList.contains('resize-grip') || 
      e.target.closest('.control-panel')) {
    return;
  }
  
  e.preventDefault();
  isDragging.value = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  
  // 如果当前使用默认位置，则转换为具体数值
  if (wrapperX.value === null || wrapperY.value === null) {
    const rect = document.getElementById(wrapperId).getBoundingClientRect();
    wrapperX.value = rect.right - window.innerWidth;
    wrapperY.value = rect.bottom - window.innerHeight;
  }
  
  initialX = wrapperX.value;
  initialY = wrapperY.value;
  
  document.addEventListener('pointermove', onWrapperMove);
  document.addEventListener('pointerup', onWrapperUp);
}

function onWrapperMove(e) {
  if (!isDragging.value) return;
  
  const deltaX = e.clientX - dragStartX;
  const deltaY = e.clientY - dragStartY;
  
  wrapperX.value = initialX + deltaX;
  wrapperY.value = initialY + deltaY;
}

function onWrapperUp() {
  isDragging.value = false;
  document.removeEventListener('pointermove', onWrapperMove);
  document.removeEventListener('pointerup', onWrapperUp);
}

// ===== 面板 =====
function togglePanel() { panelVisible.value = !panelVisible.value; }

// ===== 模型缩放 =====
function setScale(v) {
  modelScale.value = Math.round(Math.max(0.3, Math.min(1, v)) * 100) / 100;
  window.Live2DModel?.setScale(modelScale.value);
}

onMounted(() => {
  const t = setInterval(() => {
    if (!window.Live2DModel) return;
    clearInterval(t);
    Live2DModel.onReady(() => console.log('[Live2DPanel] 就绪'));
  }, 100);
});

onUnmounted(() => {
  document.removeEventListener('pointermove', onGripMove);
  document.removeEventListener('pointerup', onGripUp);
  document.removeEventListener('pointermove', onWrapperMove);
  document.removeEventListener('pointerup', onWrapperUp);
});
</script>

<template>
  <div
      :id="wrapperId"
      class="live2d-float-wrapper"
      :class="{ 'dragging': isDragging }"
      :style="{
        width: wrapperW + 'px', 
        height: wrapperH + 'px',
        right: wrapperX !== null ? (-wrapperX) + 'px' : '20px',
        bottom: wrapperY !== null ? (-wrapperY) + 'px' : '20px',
        position: 'fixed'
      }"
      @pointerdown="onWrapperDown"
      @dblclick="togglePanel"
  >
    <!-- 配置元素 -->
    <div
        class="live2d-config"
        data-cubism-model="Elysia"
        data-model-path="./Elysia"
        data-show-background="false"
        data-shader-path="https://muqingxi.com/live2d/Framework/Shaders/WebGL/"
    ></div>

    <!-- 缩放手柄 -->
    <div class="resize-grip" @pointerdown="onGripDown">
      <svg viewBox="0 0 14 14" width="14" height="14">
        <path d="M14 0v2L2 14H0l14-14zM14 4v2L6 14H4l10-10zM14 8v2l-4 4h-2l6-6zM14 12v2h-2l2-2z" fill="currentColor"/>
      </svg>
    </div>

    <!-- 控制面板 -->
    <Transition name="panel">
      <div v-if="panelVisible" class="control-panel" @pointerdown.stop>
        <div class="panel-header">
          <span>模型缩放</span>
          <button class="close-btn" @click="panelVisible = false">&times;</button>
        </div>
        <div class="scale-row">
          <input type="range" min="30" max="100"
                 :value="Math.round(modelScale * 100)"
                 @input="setScale($event.target.value / 100)" />
          <span class="scale-val">{{ Math.round(modelScale * 100) }}%</span>
        </div>
        <button class="btn-danger" @click="window.Live2DModel?.resetContainer(); setScale(1);">
          重置
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.live2d-float-wrapper {
  position: fixed;
  z-index: 9999;
  bottom: 20px;
  right: 20px;
  background: transparent;
  user-select: none;
  cursor: move;
  overflow: hidden;
}
.live2d-float-wrapper:active {
  cursor: grabbing;
}
.live2d-float-wrapper.dragging {
  cursor: grabbing;
}
.live2d-float-wrapper:hover { outline: 1px dashed rgba(255,255,255,0.15); }

.live2d-config { width: 100%; height: 100%; background: transparent; }

.resize-grip {
  position: absolute; bottom: 4px; right: 4px;
  width: 22px; height: 22px;
  cursor: nwse-resize; z-index: 30;
  color: rgba(255,255,255,0.5);
  display: flex; align-items: flex-end; justify-content: flex-end;
  transition: color 0.2s;
}
.resize-grip:hover { color: rgba(255,255,255,0.9); }

.control-panel {
  position: absolute; top: 8px; right: 8px; width: 180px;
  padding: 10px 12px;
  background: rgba(30,41,59,0.95); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;
  color: #e2e8f0; font-size: 12px;
  display: flex; flex-direction: column; gap: 6px;
  z-index: 40;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.panel-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
.close-btn { background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; line-height: 1; }
.close-btn:hover { color: #fff; }
.scale-row { display: flex; align-items: center; gap: 6px; }
.scale-row input[type="range"] { flex: 1; accent-color: #3b82f6; }
.scale-val { font-size: 13px; color: #fff; min-width: 36px; text-align: right; }
.btn-danger {
  padding: 5px 10px; border-radius: 5px; border: none;
  background: #ef4444; color: #fff; cursor: pointer; font-size: 12px;
}
.btn-danger:hover { background: #dc2626; }

.panel-enter-active, .panel-leave-active { transition: opacity 0.2s, transform 0.2s; }
.panel-enter-from, .panel-leave-to { opacity: 0; transform: scale(0.9) translateY(-4px); }
</style>

<style>
.live2d-float-wrapper > canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  background: transparent;
  touch-action: none;
}
</style>