<template>
  <div id="app">
    <div class="index-container">
      <Live2D/>
      <!-- 导航菜单 -->
      <Navigation
          :is-open="isNavigationOpen"
          @logout="handleLogout"
          @close="toggleNavigation"
      />
      <!-- 使用router-view组件让路由生效 -->
      <BackgroundCarousel>
        <router-view/>
      </BackgroundCarousel>


      <!-- 天气小部件 -->
      <WeatherWidget/>
      <!-- 音乐播放器 -->
      <GuiMusicPlayer
        theme-color="gui-girlPink"
        local-music="https://muqingxi.com:2345/proxy/music"
        :fade-out-autoplay="true"
      />
    </div>
  </div>
  <Footer/>
</template>

<script setup>
import {ref, provide} from 'vue'
import WeatherWidget from "./components/shared/WeatherWidget.vue";
import Footer from "./components/shared/Footer.vue";
import BackgroundCarousel from "./components/shared/BackgroundCarousel.vue";
import Navigation from "./components/shared/Navigation.vue";
import Live2D from "./live2D/Live2D.vue";
import GuiMusicPlayer from "./components/shared/GuiMusicPlayer.vue";

// 全局导航状态
const isNavigationOpen = ref(false)

const toggleNavigation = () => {
  isNavigationOpen.value = !isNavigationOpen.value
}

const closeNavigation = () => {
  isNavigationOpen.value = false
}

const openNavigation = () => {
  isNavigationOpen.value = true
}

// 处理登出
const handleLogout = () => {
  // 登出逻辑已在Navigation组件内部处理
}

// 提供给所有子组件
provide('globalNavigation', {
  isOpen: isNavigationOpen,
  toggle: toggleNavigation,
  close: closeNavigation,
  open: openNavigation
})
</script>

<style>
@import "tailwindcss";
/* 全局重置样式已在index.css中定义 */
</style>