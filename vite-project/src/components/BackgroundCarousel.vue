<template>
  <div id="section1">
    <div id="background-container">
      <div id="current-layer"></div>
      <div id="next-layer"></div>
    </div>
    <!-- 插槽：允许页面内容覆盖在背景之上 -->
    <slot></slot>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

// 轮播控制
const currentImageIndex = ref(0) // 当前显示的图片索引
const images = ref([]) // 预加载好的图片 URL 数组
const totalImages = 3 // 一共预加载 3 张图，t=0, t=1, t=2

// DOM 元素引用
let currentLayer = null
let nextLayer = null

// 生成固定的图片 URL，不要用 Date.now()，避免频繁请求
const getImageUrl = (index) => {
  // 只是示例，请根据实际情况使用固定图片或后端真实接口
  return `https://eopfapi.2b2x.cn/pic?img=ua&t=${index}` // t=0, t=1, t=2
}

// 预加载单张图片
const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      console.log('✅ 图片预加载成功:', url)
      resolve(url)
    }
    img.onerror = () => {
      console.error('❌ 图片预加载失败:', url)
      reject(url)
    }
    img.src = url
  })
}

// 初始化：预加载前 N 张图
const initImages = async () => {
  console.log('🔄 开始预加载轮播图片...')
  const loadedImages = []

  for (let i = 0; i < totalImages; i++) {
    const url = getImageUrl(i)
    try {
      const imgUrl = await preloadImage(url)
      loadedImages.push(imgUrl)
    } catch (err) {
      console.warn(`第 ${i + 1} 张图加载失败，跳过`, err)
      // 如果有默认占位图，可以在这里 push 占位图 URL
    }
  }

  images.value = loadedImages
  console.log('📸 预加载完成，共加载图片数量:', images.value.length)
}

// 显示某张图片（带淡入效果）
const showImage = (index) => {
  if (images.value.length === 0) return
  if (index >= images.value.length) return

  const currentLayerEl = document.getElementById('current-layer')
  const nextLayerEl = document.getElementById('next-layer')

  if (!currentLayerEl || !nextLayerEl) {
    console.error('❌ 未找到背景图层 DOM 元素')
    return
  }

  const imageUrl = images.value[index]

  // 当前显示层是 currentLayer，先设置要显示的图片
  currentLayerEl.style.backgroundImage = `url('${imageUrl}')`
  currentLayerEl.style.opacity = '1' // 确保显示
  currentLayerEl.style.transition = 'opacity 2s ease-in-out'

  // 重置 nextLayer（备用）
  nextLayerEl.style.opacity = '0'
  nextLayerEl.style.backgroundImage = ''

  console.log(`🖼️ 正在显示第 ${index + 1} 张图`)
}

// 切换到下一张图（淡出当前，淡入下一张）
const switchToNextImage = async () => {
  if (images.value.length < 2) {
    console.warn('⚠️ 图片数量不足，无法轮播')
    return
  }

  const nextIndex = (currentImageIndex.value + 1) % images.value.length

  // 预加载下一张图片确保它可用
  try {
    await preloadImage(getImageUrl(nextIndex))
  } catch (error) {
    console.error('无法加载下一张图片:', error)
    return
  }

  const currentLayerEl = document.getElementById('current-layer')
  const nextLayerEl = document.getElementById('next-layer')

  if (!currentLayerEl || !nextLayerEl) return

  const nextImageUrl = getImageUrl(nextIndex)

  // 1. 先设置下一张图到 nextLayer，并开始淡入
  nextLayerEl.style.backgroundImage = `url('${nextImageUrl}')`
  nextLayerEl.style.opacity = '0'
  nextLayerEl.style.transition = 'opacity 2s ease-in-out'

  // 强制重绘
  nextLayerEl.offsetHeight

  // 2. 开始动画：当前层淡出，下一层淡入
  currentLayerEl.style.opacity = '0'
  nextLayerEl.style.opacity = '1'

  // 3. 动画完成后（2秒后），更新 currentLayer 为下一张图，重置 nextLayer
  setTimeout(() => {
    currentLayerEl.style.backgroundImage = `url('${nextImageUrl}')`
    currentLayerEl.style.opacity = '1'
    nextLayerEl.style.opacity = '0'
    currentImageIndex.value = nextIndex
  }, 2000) // 与 CSS transition 时间保持一致
}

// 轮播控制定时器
let carouselTimer = null

// 启动轮播：每张图显示 15 秒后切换
const startCarousel = () => {
  if (images.value.length === 0) {
    console.warn('⚠️ 没有可轮播的图片，启动失败')
    return
  }

  // 先显示第 0 张图
  showImage(0)

  // 每隔 15 秒，切换到下一张图
  const DISPLAY_TIME_MS = 15000 // 每张图显示 15 秒
  carouselTimer = setInterval(() => {
    switchToNextImage()
  }, DISPLAY_TIME_MS)
}

// 组件挂载后执行
onMounted(async () => {
  console.log('[BackgroundCarousel] 组件挂载，开始初始化')

  currentLayer = document.getElementById('current-layer')
  nextLayer = document.getElementById('next-layer')

  if (!currentLayer || !nextLayer) {
    console.error('❌ 未找到 #current-layer 或 #next-layer')
    return
  }

  // 1. 预加载图片
  await initImages()

  // 2. 启动轮播（每张图显示 15 秒后切换）
  startCarousel()
})
</script>