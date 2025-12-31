<template>
  <div id="content-container">
    <h1 id="site-title"><i class="fas fa-globe"></i> 网站运行统计</h1>

    <div id="stats-container">
      <div id="stat-box-running">
        <div id="stat-title-running"><i class="fas fa-calendar-alt"></i> 运行时间</div>
        <div id="running-time">
          <div id="simple-running-time">{{ runningTime.years }}年{{ runningTime.months }}月{{ runningTime.days }}天</div>
        </div>
      </div>
      <div id="stat-box-views">
        <div id="stat-title-views"><i class="fas fa-users"></i> 访问人数</div>
        <div id="view-count">{{ viewCount }}</div>
      </div>
      <!-- 新增卡片：博主正在玩 -->
      <div id="stat-box-playing">
        <div id="stat-title-playing"><i class="fas fa-gamepad"></i>{{ isRbqBroken ? '您的小伙伴已下线' : '您的小伙伴正在玩' }}</div>
        <ul id="playing-list">
          <li v-for="item in playingSoft" :key="item" class="playing-item">{{ item }}</li>
        </ul>
      </div>
      <div class="time-units">
          <div class="time-unit">
            <div class="time-value" id="years">{{ runningTime.years }}</div>
            <div class="time-label">年</div>
          </div>
          <div class="time-unit">
            <div class="time-value" id="months">{{ runningTime.months }}</div>
            <div class="time-label">月</div>
          </div>
          <div class="time-unit">
            <div class="time-value" id="days">{{ runningTime.days }}</div>
            <div class="time-label">天</div>
          </div>
          <div class="time-unit">
            <div class="time-value" id="hours">{{ runningTime.hours % 24 }}</div>
            <div class="time-label">时</div>
          </div>
          <div class="time-unit">
            <div class="time-value" id="minutes">{{ runningTime.minutes % 60 }}</div>
            <div class="time-label">分</div>
          </div>
          <div class="time-unit">
            <div class="time-value" id="seconds">{{ runningTime.seconds % 60 }}</div>
            <div class="time-label">秒</div>
          </div>
        </div>
    </div>

    <div id="last-updated">
      <i class="fas fa-sync-alt"></i> 最后更新: <span id="update-time">{{ updateTime }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'

// 响应式数据
const runningTime = reactive({
  years: 0,
  months: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0
})

const updateTime = ref('--')
const viewCount = ref('加载中...')
const playingSoft = ref([])
const isRbqBroken = ref(false)

// 网站启动日期
const siteLaunchDate = new Date('2025-07-01T00:00:00')

// 方法：更新运行时间
const updateRunningTime = () => {
  const now = new Date()
  const diff = now - siteLaunchDate

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  const remainingDays = days % 30

  runningTime.years = years
  runningTime.months = months
  runningTime.days = remainingDays
  runningTime.hours = hours % 24
  runningTime.minutes = minutes % 60
  runningTime.seconds = seconds % 60

  updateTime.value = now.toLocaleTimeString()
}

// 方法：获取访问量
const fetchPageViews = async () => {
  try {
    const response = await fetch('http://luren.online:2345/proxy/getPageViews')

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === '200') {
      viewCount.value = data.view.toLocaleString()
    } else {
      viewCount.value = '数据获取失败'
    }
  } catch (error) {
    console.error('获取访问量失败:', error)
    viewCount.value = '获取失败'
  }
}

// 方法：获取“博主正在玩”
const fetchPlayingSoft = async () => {
  try {
    const response = await fetch('http://luren.online:8080/stalkLook?name=%E7%A9%86%E6%B8%85%E5%85%AE')
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`)
    }
    const data = await response.json()

    // 检测接口返回的特殊提示："该小伙伴没有被视监"
    const BROKEN_MSG = '该小伙伴没有被视监'
    const msgCandidate =
      (typeof data === 'string' ? data : '') ||
      (typeof data?.msg === 'string' ? data.msg : '') ||
      (typeof data?.message === 'string' ? data.message : '')

    if (msgCandidate && msgCandidate.includes(BROKEN_MSG)) {
      isRbqBroken.value = true
      playingSoft.value = []
      // 若返回该提示，则不再继续渲染列表数据
      return
    } else {
      isRbqBroken.value = false
    }
    // 渲染列表
    if (Array.isArray(data.soft)) {
      playingSoft.value = data.soft
    } else {
      playingSoft.value = []
    }
    // 使用接口返回的 time 作为“最后更新”
    if (data.time) {
      const t = Number(data.time)
      if (!Number.isNaN(t)) {
        updateTime.value = new Date(t).toLocaleString()
      }
    }
  } catch (error) {
    console.error('获取“博主正在玩”失败:', error)
  }
}

let timeInterval = null

// 生命周期
onMounted(() => {
  updateRunningTime()
  fetchPageViews()
  fetchPlayingSoft()
  timeInterval = setInterval(updateRunningTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
/* 从原CSS中提取相关样式 */
#content-container {
  text-align: center;
  padding: 20px;
}


#site-title {
  font-size: 2.8rem;
  margin-bottom: 30px;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  color: #fff;
}

#stats-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

#stat-box-running,
#stat-box-views,
#stat-box-playing {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 12px 25px;
  min-width: 350px;
  max-width: 500px;
  flex: 1;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
  line-height: 1.3;
}

#stat-box-running:hover,
#stat-box-views:hover,
#stat-box-playing:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.15);
}

#stat-title-running,
#stat-title-views,
#stat-title-playing {
  font-size: 1.1rem;
  margin-bottom: 10px;
  color: #fff94c;
  line-height: 1.2;
}

#simple-running-time {
  font-size: 1.8rem;
  font-weight: 700;
  color: #4cdbff;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
  padding: 10px 0;
  line-height: 1.2;
}

.time-units {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
  width: 100%;
}

.time-unit {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 10px 20px;
  min-width: 90px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  line-height: 1.1;
}

.time-unit:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.1);
}

.time-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #ff6b6b;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
  line-height: 1.1;
}

.time-label {
  font-size: 0.9rem;
  margin-top: 3px;
  color: #ccc;
  line-height: 1.1;
}

#view-count {
  font-size: 2.2rem;
  font-weight: 700;
  color: #4cdbff;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
  padding: 10px 0;
  line-height: 1.2;
}

/* Playing 列表样式 */
#playing-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.playing-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 0.95rem;
  color: #eee;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

#last-updated {
  margin-top: 20px;
  font-size: 0.9rem;
  color: #ccc;
}

@media (max-width: 768px) {
  #stats-container {
    flex-direction: column;
  }
  
  #stat-box-running,
  #stat-box-views,
  #stat-box-playing {
    min-width: 100%;
  }
  
  .time-units {
    flex-direction: column;
  }

  .time-unit {
    min-width: 100%;
  }

  .time-value {
    font-size: 1.5rem;
  }
  
  #view-count {
    font-size: 2rem;
  }
}
</style>