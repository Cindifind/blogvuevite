<template>
  <div ref="playerRef" class="gui-music-player-mount"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  /** 主题色：gui-original / gui-sky / gui-orange / gui-girlPink 等 */
  themeColor: { type: String, default: 'gui-girlPink' },
  /** 本地音乐 API 地址 */
  localMusic: { type: String, default: '' },
  /** 歌单 ID（与 localMusic 二选一） */
  songList: { type: String, default: '' },
  /** 音乐 API 地址 */
  musicApi: { type: String, default: '' },
  /** 排行榜名称 */
  songChart: { type: String, default: '' },
  /** CDN 基础路径 */
  cdnName: { type: String, default: '' },
  /** 文件路径前缀 */
  filePath: { type: String, default: '' },
  /** 是否淡出自动播放 */
  fadeOutAutoplay: { type: Boolean, default: false }
})

const playerRef = ref(null)
let styleElements = []
let scriptElement = null

/** 动态加载 CSS */
function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve()
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = resolve
    link.onerror = () => reject(new Error(`CSS 加载失败: ${href}`))
    document.head.appendChild(link)
    styleElements.push(link)
  })
}

/** 动态加载 JS */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = () => reject(new Error(`JS 加载失败: ${src}`))
    document.body.appendChild(script)
    scriptElement = script
  })
}

/** 清理播放器残留 DOM */
function cleanup() {
  // 移除 audio 元素
  const audio = document.getElementById('gui-musicAudio')
  if (audio) audio.remove()
  // 移除歌词元素
  const lyric = document.getElementById('gui-lyric')
  if (lyric) lyric.remove()
  // 移除动态加载的样式
  styleElements.forEach(el => el.remove())
  styleElements = []
  // 移除动态加载的脚本
  if (scriptElement && scriptElement.parentNode) {
    scriptElement.parentNode.removeChild(scriptElement)
    scriptElement = null
  }
  // 清理可能的弹出提示
  const pop = document.querySelector('.gui-music-pop')
  if (pop) pop.remove()
}

onMounted(async () => {
  const base = '/gui-MusicPlayer'

  try {
    // 1. 加载 CSS
    await Promise.all([
      loadStylesheet(`${base}/icon/guiplayIcon.css`),
      loadStylesheet(`${base}/css/gui-MusicPlayer.css`)
    ])

    // 2. 在挂载点创建播放器容器（gui-MusicPlayer.js 会读取这些 data 属性）
    const container = document.createElement('div')
    container.id = 'gui-MusicPlayer'
    container.setAttribute('data-themeColor', props.themeColor)
    if (props.localMusic) container.setAttribute('data-localMusic', props.localMusic)
    if (props.songList) container.setAttribute('data-songList', props.songList)
    if (props.musicApi) container.setAttribute('data-musicApi', props.musicApi)
    if (props.songChart) container.setAttribute('data-songChart', props.songChart)
    if (props.cdnName) container.setAttribute('data-cdnName', props.cdnName)
    if (props.filePath) container.setAttribute('data-filePath', props.filePath)
    if (props.fadeOutAutoplay) container.setAttribute('data-fadeOutAutoplay', '')
    playerRef.value.appendChild(container)

    // 3. 加载并初始化播放器
    // 禁用自动初始化，由 Vue 手动触发
    window.disableAutoInit = true
    await loadScript(`${base}/js/gui-MusicPlayer.js`)

    // 手动初始化
    if (window.GuiMusicPlayer) {
      window.GuiMusicPlayer.init()
    } else if (window.initMusicPlayer) {
      window.initMusicPlayer()
    }
    // 注意：歌单列表渲染、图片懒加载、播放控制、状态同步
    // 全部由 MusicTool.vue 负责（通过直接操作 #gui-MusicPlayer DOM），
    // 本组件只负责加载原生播放器资源并触发初始化，
    // 避免与原生播放器自身的 updateSong / bindSongEvents 冲突导致切歌失效。
  } catch (err) {
    console.error('[GuiMusicPlayer] 初始化失败:', err)
  }
})

onBeforeUnmount(() => {
  cleanup()
})
</script>

<style scoped>
.gui-music-player-mount {
  width: 100%;
  height: 100%;
}
</style>
