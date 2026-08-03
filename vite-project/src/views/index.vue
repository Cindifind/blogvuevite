<!-- index.vue -->
<template>
  <div class="index-container">
    <!-- 第一屏 - 背景轮播和统计信息 -->
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
}
</style>
