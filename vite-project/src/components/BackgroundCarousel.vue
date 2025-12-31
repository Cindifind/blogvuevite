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

// 生成图片文件列表 (1-979.webp)
const totalImages = 979; // 总共有979张图片
const imageFiles = [];
for (let i = 1; i <= totalImages; i++) {
  imageFiles.push(`${i}.webp`);
}

// DOM 元素引用
let currentLayer = null
let nextLayer = null

// 生成图片 URL，从本地 image 目录随机获取
const getImageUrl = () => {
  // 随机选择一张图片
  const randomIndex = Math.floor(Math.random() * imageFiles.length);
  return `/image/${imageFiles[randomIndex]}`;
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

// 初始化：不需要预加载图片，因为每次都是随机获取
const initImages = async () => {
  console.log('🔄 背景轮播初始化完成')
  // 不再预加载图片，直接初始化为空数组
  images.value = []
  console.log('📸 背景轮播已准备就绪')
}

// 显示某张图片（带淡入效果）
const showImage = () => {
  const currentLayerEl = document.getElementById('current-layer')
  const nextLayerEl = document.getElementById('next-layer')

  if (!currentLayerEl || !nextLayerEl) {
    console.error('❌ 未找到背景图层 DOM 元素')
    return
  }

  // 随机选择一张图片显示
  const imageUrl = getImageUrl() // 随机获取图片URL

  // 当前显示层是 currentLayer，先设置要显示的图片
  currentLayerEl.style.backgroundImage = `url('${imageUrl}')`
  currentLayerEl.style.opacity = '1' // 确保显示
  currentLayerEl.style.transition = 'opacity 2s ease-in-out'

  // 重置 nextLayer（备用）
  nextLayerEl.style.opacity = '0'
  nextLayerEl.style.backgroundImage = ''

  console.log(`🖼️ 正在显示随机图片`)
}

// 切换到下一张图（淡出当前，淡入下一张）
const switchToNextImage = async () => {
  // 随机选择下一张图片
  const nextImageUrl = getImageUrl() // 随机获取图片URL

  const currentLayerEl = document.getElementById('current-layer')
  const nextLayerEl = document.getElementById('next-layer')

  if (!currentLayerEl || !nextLayerEl) return

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
    // 更新当前图片索引（虽然索引不再代表具体图片，但可用来追踪切换次数）
    currentImageIndex.value = (currentImageIndex.value + 1) % totalImages
  }, 2000) // 与 CSS transition 时间保持一致
}

// 轮播控制定时器
let carouselTimer = null

// 启动轮播：每张图显示 15 秒后切换
const startCarousel = () => {
  // 先显示一张随机图片
  showImage()

  // 每隔 15 秒，切换到下一张随机图
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