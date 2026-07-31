<!-- Music.vue -->
<template>
  <div class="relative">
    <MusicTool />
    <!-- 未登录时显示 Login 覆盖层 -->
    <Transition name="loginOverlay">
      <div v-if="!isLoggedIn" class="login-overlay">
        <Login noRedirect />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import MusicTool from '../components/MusicTool.vue'
import Login from '../components/Login.vue'
import { useAuth } from '../composables/useAuth'

const { isLoggedIn } = useAuth()
</script>

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loginOverlay-enter-active,
.loginOverlay-leave-active {
  transition: opacity 0.4s ease;
}
.loginOverlay-enter-from,
.loginOverlay-leave-to {
  opacity: 0;
}
</style>
