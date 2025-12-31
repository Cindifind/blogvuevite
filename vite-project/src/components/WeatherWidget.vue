<template>
  <div class="weather-widget">
    <div class="weather-toggle" id="weather-toggle" @click="toggleWeatherCard">
      <i class="fas fa-cloud-sun"></i>
    </div>
    <div class="weather-card" :class="{ 'hidden': !isWeatherVisible }" id="weather-card">
      <div class="weather-header">
        <div class="location-info">
          <h2>天气信息</h2>
          <p>正在获取数据...</p>
        </div>
        <button class="refresh-button" id="refresh-weather" @click="refreshWeather">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
      <div id="weather-content">
        <div class="loading-container">
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 响应式数据
const isWeatherVisible = ref(false)
const weatherData = ref(null)

// 方法
const toggleWeatherCard = () => {
  isWeatherVisible.value = !isWeatherVisible.value
}

const refreshWeather = () => {
  fetchWeatherData()
}

const fetchWeatherData = async () => {
  const contentElement = document.getElementById('weather-content')
  const locationInfo = document.querySelector('.location-info')

  if (!contentElement || !locationInfo) return

  // 显示加载状态
  contentElement.innerHTML = `
    <div class="loading-spinner"></div>
  `

  try {
    const response = await fetch('http://v4.luren.online:2345/proxy/getWeather')
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === 'success') {
      weatherData.value = data
      locationInfo.innerHTML = `
        <h2>${data.city}</h2>
        <p>${data.province} · ${data.adcode}</p>
      `

      // 更新天气图标
      const toggleBtn = document.querySelector('.weather-toggle i')
      if (toggleBtn) {
        const iconClass = getWeatherIcon(data.weather)
        toggleBtn.className = `fas ${iconClass}`
      }

      // 渲染天气数据
      contentElement.innerHTML = weatherCardTemplate(data)
    } else {
      contentElement.innerHTML = errorTemplate(data.message || '获取天气信息失败')
    }
  } catch (error) {
    console.error('获取天气信息失败:', error)
    contentElement.innerHTML = errorTemplate('网络请求失败，请检查连接')
  }
}

const getWeatherIcon = (weather) => {
  if (weather.includes('晴')) return 'fa-sun'
  if (weather.includes('云') || weather.includes('阴')) return 'fa-cloud'
  if (weather.includes('雨')) return 'fa-cloud-rain'
  if (weather.includes('雪')) return 'fa-snowflake'
  if (weather.includes('雾') || weather.includes('霾')) return 'fa-smog'
  if (weather.includes('风')) return 'fa-wind'
  return 'fa-cloud-sun'
}

const weatherCardTemplate = (data) => `
  <div class="weather-main">
    <div class="temperature">${data.temperature}°C</div>
    <div class="weather-condition">${data.weather}</div>
  </div>
  <div class="weather-details">
    <div class="detail-item">
      <i class="fas fa-wind"></i>
      <div>
        <div class="detail-label">风向/风力</div>
        <div class="detail-value">${data.winddirection}风 ${data.windpower}</div>
      </div>
    </div>
    <div class="detail-item">
      <i class="fas fa-tint"></i>
      <div>
        <div class="detail-label">湿度</div>
        <div class="detail-value">${data.humidity}%</div>
      </div>
    </div>
    <div class="detail-item">
      <i class="fas fa-network-wired"></i>
      <div>
        <div class="detail-label">IP地址</div>
        <div class="detail-value">${data.ip || '未知'}</div>
      </div>
    </div>
    <div class="detail-item">
      <i class="fas fa-check-circle"></i>
      <div>
        <div class="detail-label">状态</div>
        <div class="detail-value">${data.status === 'success' ? '成功' : '失败'}</div>
      </div>
    </div>
  </div>
  <div class="update-time">
    更新时间: ${data.reporttime}
  </div>
`

const errorTemplate = (message) => `
  <div class="error-message">
    <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
    <p>${message}</p>
  </div>
`

// 生命周期
onMounted(() => {
  // 初始自动调用一次API
  fetchWeatherData()
})
</script>

<style scoped>
/* 从原CSS中提取天气相关样式 */
.weather-widget {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.weather-toggle {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.weather-toggle:hover {
  background: rgba(255, 255, 255, 0.25);
}

.weather-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  width: 300px;
  color: #fff;
  margin-top: 10px;
  animation: weather-fadeIn 0.3s ease-out;
}

.weather-card.hidden {
  display: none;
}

.weather-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
}

.location-info h2 {
  font-size: 1.3rem;
  margin: 0;
  font-weight: 600;
}

.location-info p {
  margin: 5px 0 0 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

.refresh-button {
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  padding: 0;
  margin: 0;
  line-height: 30px;
  box-sizing: border-box;
}

.refresh-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

@keyframes weather-fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes weather-spin {
  to { transform: rotate(360deg); }
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: weather-spin 1s linear infinite;
}

.error-message {
  text-align: center;
  padding: 20px;
  color: #ff6b6b;
  font-size: 0.9rem;
}
</style>