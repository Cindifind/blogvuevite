<template>
  <div>
    <!-- 加载动画元素 -->
    <div id="loading" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #fff; z-index: 9999; display: flex; justify-content: center; align-items: center;">
      <div>Loading...</div>
    </div>
    
    <!-- 菜单切换按钮 -->
    <div 
      id="menu" 
      class="hover_animation menu_open"
      data-mark="false"
      @click="handleMenuToggle"
    >
      <span></span>
      <span></span>
      <span></span>
    </div>
    
    <!-- 导航菜单 -->
    <div
        id="navgation"
        class="navgation navgation_close"
    >
      <ul class="point">
        <li><router-link to="/">首页</router-link></li>
        <li><router-link to="/blog">博客</router-link></li>
        <!-- <li><router-link to="/music">音乐</router-link></li> -->
        <li><router-link to="/h5tools">玩具箱</router-link></li>
<!--        <li v-if="isLoggedIn"><router-link to="/voice">语音生成</router-link></li>-->
        <!-- 管理员专用导航 -->
        <li v-if="isAdmin"><router-link to="/api-management">API管理</router-link></li>
        <!-- <li><router-link to="/">留言</router-link></li> -->
        <!-- <li><router-link to="/api">Api</router-link></li> -->
        <!-- 用户未登录时显示登录链接 -->
        <li v-if="!isLoggedIn" id="login-link">
          <router-link to="/login">登录</router-link>
        </li>

        <!-- 用户已登录时显示用户信息 -->
        <li v-else id="user-info-item" style="display: flex;">
          <div class="user-info">
            <img
                id="user-avatar"
                :src="userInfo?.imgUrl || defaultAvatar"
                :alt="userInfo?.name || '用户头像'"
                class="user-avatar"
                referrerPolicy="no-referrer"
                @error="handleImageError"
            >
            <span id="user-name" class="user-name">{{ userInfo?.name || userInfo?.email || '用户' }}</span>
            <button id="logout-btn" class="logout-btn" @click="handleLogout">退出</button>
          </div>
        </li>
      </ul>
      <div class="logo">
        <router-link to="/">Qingxi Mu</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['logout', 'close'])

// 路由实例
const router = useRouter()

// 使用 useAuth composable 获取用户信息
const { isLoggedIn, userInfo, logout: authLogout } = useAuth()

// 计算属性：是否为管理员
const isAdmin = computed(() => {
  return isLoggedIn.value && userInfo.value?.grade === 3
})

// 响应式数据
const defaultAvatar = ref('data:image/svg+xml;utf8,<svg xmlns="https://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23cccccc"/><text x="12" y="16" font-size="12" text-anchor="middle" fill="%23666666">?</text></svg>')

// 菜单状态
const isMenuOpen = ref(false)

// 监听用户信息变化，确保UI及时更新
watch([isLoggedIn, userInfo], (newValues, oldValues) => {
  console.log('用户状态变化:', { 
    isLoggedIn: newValues[0], 
    userInfo: newValues[1],
    oldIsLoggedIn: oldValues?.[0],
    oldUserInfo: oldValues?.[1]
  })
  // 强制重新渲染
  nextTick(() => {
    console.log('DOM更新完成')
    // 强制触发响应式更新
    if (newValues[0] && newValues[1]) {
      console.log('用户已登录，用户信息:', newValues[1])
    }
  })
}, { deep: true, immediate: true, flush: 'post' })

// 初始化加载动画
const initializeLoading = () => {
  const loadingElement = document.getElementById('loading')
  if (loadingElement) {
    setTimeout(() => {
      loadingElement.style.opacity = '0'
      setTimeout(() => {
        loadingElement.style.display = 'none'
      }, 500)
    }, 100)
  }
}

// 初始化WOW动画
const initializeWOW = () => {
  if (window.WOW) {
    new window.WOW().init()
  }
}

// 初始化Layui Fixbar
const initializeFixbar = () => {
  if (window.layui && window.layui.util) {
    window.layui.util.fixbar()
  }
}

// 滚动到section1
const scrollToSection1 = () => {
  const section1 = document.getElementById('section1')
  if (section1) {
    const scrollTop = section1.offsetHeight + 1
    window.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    })
  }
}

// 处理菜单切换
const handleMenuToggle = () => {
  const menuElement = document.getElementById('menu');
  const navgationElement = document.getElementById('navgation');
  
  if (menuElement && navgationElement) {
    const mark = menuElement.getAttribute('data-mark');
    
    if (mark === 'false') {
      // 打开菜单
      menuElement.classList.remove('menu_open');
      menuElement.classList.add('menu_close');
      navgationElement.classList.remove('navgation_close');
      navgationElement.classList.add('navgation_open');
      menuElement.setAttribute('data-mark', 'true');
      isMenuOpen.value = true;
    } else {
      // 关闭菜单
      menuElement.classList.remove('menu_close');
      menuElement.classList.add('menu_open');
      navgationElement.classList.remove('navgation_open');
      navgationElement.classList.add('navgation_close');
      menuElement.setAttribute('data-mark', 'false');
      isMenuOpen.value = false;
    }
  }
}

// 组件挂载时初始化
onMounted(() => {
  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    window.addEventListener('load', () => {
      initializeLoading()
      initializeWOW()
    })
  } else {
    initializeLoading()
    initializeWOW()
  }
  
  // 初始化Fixbar
  initializeFixbar()
  
  console.log('组件已挂载，菜单按钮应该可以点击了')
})

// 组件卸载时清理事件监听器
onUnmounted(() => {
  console.log('组件卸载')
})

// 方法
const handleImageError = (event) => {
  event.target.src = defaultAvatar.value
}

// 处理登出 - 使用 useAuth 中的登出方法
const handleLogout = () => {
  authLogout()
  emit('logout')
}

// 添加关闭导航菜单的方法
const handleClose = () => {
  isMenuOpen.value = false
  emit('close')
}
</script>

<style scoped>
/* 从 index_style.css 提取的导航栏相关样式 */

.logo {
  font-size: 50px;
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 101;
  padding: 10px 50px;
}

.logo a {
  font-family: 'BarbaraHand', cursive; /* 添加后备字体 */
  color: #686967;
  text-decoration: none;
  font-weight: normal;
  font-style: normal;
}

/* 基础样式重置 */
* {
  padding: 0;
  margin: 0;
}

/* 基础样式重置 */
* {
  padding: 0;
  margin: 0;
}

/* 用户信息样式 */
.user-info {
  display: flex !important;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  margin: 5px 10px;
}

.user-avatar {
  width: 25px !important;
  height: 25px !important;
  border-radius: 50%;
  border: 1px solid #fff;
  display: block !important;
  object-fit: cover;
}

.user-name {
  font-family: "Microsoft YaHei", serif;
  color: #686967;
  font-size: 20px;
}

.logout-btn {
  background: #ff4d4d;
  color: white;
  border: none;
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
}

</style>