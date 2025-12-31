<!-- login.vue -->
<template>
    <!-- 第一屏 - 背景轮播和统计信息 -->
      <Login />
</template>

<script setup>
import { inject } from 'vue'
import { useAuth } from '../composables/useAuth'
import Login from '../components/Login.vue'

// 🔧 使用 useAuth() composable
const { isLoggedIn, userInfo, login, logout } = useAuth()

// 注入全局导航状态
const globalNavigation = inject('globalNavigation')

// 使用全局状态
const isNavigationOpen = globalNavigation.isOpen

// 切换导航菜单
const toggleNavigation = () => {
  globalNavigation.toggle()
}

// 处理登出
const handleLogout = () => {
  logout()
}
</script>

<style scoped>
.index-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
