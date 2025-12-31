<!-- api.vue -->
<template>
        <MusicTool />
</template>

<script setup>
import { ref, inject } from 'vue'
import ApiStats from '../components/MusicTool.vue'
import MusicTool from '../components/MusicTool.vue'


// 注入全局导航状态
const globalNavigation = inject('globalNavigation')


// 切换导航菜单
const toggleNavigation = () => {
  globalNavigation.toggle()
}

// 处理登出
const handleLogout = () => {
  logout()
}
</script>

