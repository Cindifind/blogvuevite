<!-- index.vue -->
<template>
  <div class="index-container">
    <!-- 第一屏 - 背景轮播 + 功能入口动画 -->
    <StatsSection />
  </div>
  
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import StatsSection from '../components/shared/StatsSection.vue'

// 🔧 使用 useAuth() composable
const { isLoggedIn, userInfo, login, logout } = useAuth()
</script>

<style scoped>
.index-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
</style>
