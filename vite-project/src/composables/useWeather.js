// 天气相关逻辑
export function fetchWeatherData() {
    return new Promise((resolve, reject) => {
        const contentElement = document.getElementById('weather-content')
        const locationInfo = document.querySelector('.location-info')

        if (!contentElement || !locationInfo) {
            resolve({ success: false, message: '找不到天气元素' })
            return
        }

        // 显示加载状态
        contentElement.innerHTML = `
      <div class="loading-spinner"></div>
    `

        fetch('http://v4.luren.online/api/getWeather')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`)
                }
                return response.json()
            })
            .then(data => {
                if (data.status === 'success') {
                    // 更新位置信息
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
                    resolve({ success: true, data })
                } else {
                    contentElement.innerHTML = errorTemplate(data.message || '获取天气信息失败')
                    resolve({ success: false, message: data.message || '获取天气信息失败' })
                }
            })
            .catch(error => {
                console.error('获取天气信息失败:', error)
                contentElement.innerHTML = errorTemplate('网络请求失败，请检查连接')
                resolve({ success: false, message: '网络请求失败，请检查连接' })
            })
    })
}

function getWeatherIcon(weather) {
    if (weather.includes('晴')) return 'fa-sun'
    if (weather.includes('云') || weather.includes('阴')) return 'fa-cloud'
    if (weather.includes('雨')) return 'fa-cloud-rain'
    if (weather.includes('雪')) return 'fa-snowflake'
    if (weather.includes('雾') || weather.includes('霾')) return 'fa-smog'
    if (weather.includes('风')) return 'fa-wind'
    return 'fa-cloud-sun'
}

function weatherCardTemplate(data) {
    return `
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
}

function errorTemplate(message) {
    return `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
      <p>${message}</p>
    </div>
  `
}

// 刷新天气数据
export function refreshWeather() {
    return fetchWeatherData()
}