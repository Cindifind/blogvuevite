<template>
  <div class="h5tools-page">
    <H5Tools />
  </div>
</template>

<script setup>
import { inject } from 'vue'
import H5Tools from '../components/H5Tools.vue'

// 注入全局导航状态
const globalNavigation = inject('globalNavigation')

// 使用全局状态
const isNavigationOpen = globalNavigation.isOpen

// 切换导航菜单
const toggleNavigation = () => {
  globalNavigation.toggle()
}
</script>

<style scoped>
.h5tools-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>