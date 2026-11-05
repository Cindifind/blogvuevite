<template>
  <div class="home-stage">
    <PointerBoxes
      ref="pointerRef"
      class="home-anim"
      :pointer-count="16"
      :pointer-size="24"
      :pointer-drag-size="36"
      :min-speed="0.35"
      :max-speed="1.2"
      :near-radius="170"
      :lock-radius="85"
      :seek-speed="9"
      :idle-opacity="0.3"
      :near-opacity="0.72"
      :normal-stagger="0.07"
      :big-text-stagger="0.028"
      :type-delay="420"
      :pointer-z-index="60"
      :hide-native-cursor="false"
      background="transparent"
    >
      <div class="home-wrap">
        <!-- ── 首屏：站点标题 + 副标题胶囊 ── -->
        <header class="home-hero">
          <p class="hero-eyebrow">MUQINGXI · PERSONAL SPACE</p>

          <h1
            class="vpb-box hero-title"
            data-dir="up"
            data-growth-rate="4.4"
            data-placeholder=""
            :data-text="heroTitle"
          >{{ heroTitle }}</h1>

          <p
            class="vpb-box hero-subtitle"
            data-dir="down"
            data-growth-rate="5"
            data-big-text
            data-placeholder=""
            :data-text="heroSubtitle"
          >{{ heroSubtitle }}</p>

          <p class="hero-hint">拖开游走的指针，让内容自己打出来</p>
        </header>

        <!-- ── 站点数据：每一格都是一个独立的 vpb-box ── -->
        <section class="stat-board" aria-label="站点数据">
          <!-- 盒内文本必须保持稳定：数值只走 data-text，否则 Vue 重渲染会用
               textContent 覆盖 PointerBoxes 运行时注入的 .vpb-inner -->
          <div
            v-for="stat in statTiles"
            :key="stat.key"
            class="vpb-box stat-tile"
            :class="`stat-tile--${stat.key}`"
            data-dir="br"
            data-growth-rate="5.4"
            data-big-text
            data-placeholder=""
            :data-text="stat.value"
            :aria-label="`${stat.label}：${stat.value}`"
          >{{ stat.label }}</div>
        </section>

        <!-- ── 三大入口：左右交替图文 ── -->
        <main class="feature-list">
          <section
            v-for="(feature, index) in features"
            :key="feature.key"
            class="feature-row"
            :class="{ 'is-reverse': index % 2 === 1 }"
          >
            <div class="feature-copy" :class="`feature-copy--${feature.key}`">
              <h2
                class="vpb-box feature-title"
                :class="`feature-title--${feature.key}`"
                :data-dir="index % 2 === 1 ? 'left' : 'right'"
                data-growth-rate="4.6"
                data-placeholder=""
                :data-text="feature.title"
              >{{ feature.title }}</h2>

              <p
                class="vpb-box feature-desc"
                :data-dir="index % 2 === 1 ? 'left' : 'right'"
                data-growth-rate="5.2"
                data-big-text
                data-placeholder=""
                :data-text="feature.desc"
              >{{ feature.desc }}</p>
            </div>

            <router-link
              class="vpb-box feature-media"
              :class="`feature-media--${feature.key}`"
              :data-dir="index % 2 === 1 ? 'right' : 'left'"
              data-growth-rate="4.4"
              data-text=""
              data-placeholder=""
              :to="feature.path"
              :aria-label="`进入${feature.title}`"
            >{{ feature.title }}</router-link>
          </section>
        </main>

        <div
          class="vpb-box home-foot"
          data-dir="up"
          data-growth-rate="5"
          data-big-text
          data-placeholder=""
          :data-text="footerText"
        >{{ footerText }}</div>
      </div>
    </PointerBoxes>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import PointerBoxes from '../../vue-pointer-boxes/PointerBoxes.vue'

const pointerRef = ref(null)

// 首屏文案
const heroTitle = '穆清兮的博客'
const heroSubtitle = '技术 · 音乐 · 灵感'
const footerText = '拖动游走的指针 · 让每一块内容自己展开'

// 首页三大功能入口（按 博客 → 音乐 → 工具箱 顺序，奇偶行左右交替）
const features = [
  {
    key: 'blog',
    title: '博客',
    path: '/blog',
    desc: '技术文章、开发笔记与生活随笔，记录每一次思考与分享。从代码到日常，把值得留下的都写下来。'
  },
  {
    key: 'music',
    title: '音乐',
    path: '/music',
    desc: '歌单、播放器与音乐小工具，让日常多一点旋律。挑一首喜欢的歌，从这里开始循环。'
  },
  {
    key: 'tools',
    title: '工具箱',
    path: '/h5tools',
    desc: 'H5 在线工具集合，打开即用，不装软件。常用的、冷门的，都收进这一只盒子里。'
  }
]

// 网站启动日期 & 已运行天数（打开页面时结算一次）
const siteLaunchDate = new Date('2025-07-01T00:00:00')
const totalDays = ref(
  Math.max(0, Math.floor((Date.now() - siteLaunchDate.getTime()) / 86400000))
)

// 站点数据
const viewCount = ref(null)
const updateTime = ref('同步中')
const playingSoft = ref([])
const batteryLevel = ref(null)

const truncate = (text, max = 6) => {
  const str = String(text || '').trim()
  return str.length > max ? `${str.slice(0, max)}…` : str
}

const formatViews = (value) => {
  if (value === null || value === undefined || value === '') return '同步中'
  const raw = String(value).replace(/,/g, '')
  const num = Number(raw)
  if (!Number.isFinite(num)) return String(value)
  return num >= 10000 ? `${(num / 10000).toFixed(1)} 万` : num.toLocaleString()
}

const toClock = (timestamp) => {
  const date = timestamp ? new Date(Number(timestamp)) : new Date()
  const safe = Number.isNaN(date.getTime()) ? new Date() : date
  return safe.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 五个数据格：文案通过 data-text 交给 PointerBoxes 打字
const statTiles = computed(() => [
  { key: 'days', label: '已运行', value: `${totalDays.value} 天` },
  { key: 'views', label: '总访问', value: formatViews(viewCount.value) },
  { key: 'sync', label: '最近同步', value: updateTime.value },
  {
    key: 'pc',
    label: '电脑在听',
    value: playingSoft.value.length ? truncate(playingSoft.value[0]) : '未在播放'
  },
  {
    key: 'phone',
    label: '手机电量',
    value: batteryLevel.value !== null ? `${batteryLevel.value}%` : '离线'
  }
])

// 方法：获取访问量
const fetchPageViews = async () => {
  try {
    const response = await fetch('https://muqingxi.com:2345/proxy/getPageViews')

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`)
    }

    const data = await response.json()
    viewCount.value = String(data.status) === '200' ? data.view : '数据获取失败'
  } catch (error) {
    console.error('获取访问量失败:', error)
    viewCount.value = '获取失败'
  }
}

// 方法：获取"博主正在玩"
const fetchPlayingSoft = async () => {
  try {
    const response = await fetch('https://muqingxi.com:8080/stalkLook?name=%E7%A9%86%E6%B8%85%E5%85%AE')
    if (!response.ok) {
      throw new Error(`HTTP错误：${response.status}`)
    }
    const data = await response.json()

    // 检测接口返回的特殊提示："该小伙伴没有被视监"
    const BROKEN_MSG = '该小伙伴没有被视监'
    const msgCandidate =
      (typeof data === 'string' ? data : '') ||
      (typeof data?.msg === 'string' ? data.msg : '') ||
      (typeof data?.message === 'string' ? data.message : '')

    if (msgCandidate && msgCandidate.includes(BROKEN_MSG)) {
      playingSoft.value = []
      batteryLevel.value = null
      updateTime.value = toClock()
      return
    }

    // 电脑：data.computer.soft 是正在播放 / 最近播放的软件名列表
    playingSoft.value =
      data.computer && Array.isArray(data.computer.soft) ? data.computer.soft : []

    // 手机：电量与最近上报时间
    batteryLevel.value =
      data.phone && data.phone.batteryLevel !== undefined ? data.phone.batteryLevel : null
    updateTime.value = toClock(data.phone?.time)
  } catch (error) {
    console.error('获取"博主正在玩"失败:', error)
    updateTime.value = toClock()
  }
}

let homeSection = null
let breakpointTimer = null
let lastNarrow = null

// 横竖屏 / 断点切换后重新扫描盒子，避免沿用旧的最终尺寸
const handleViewportChange = () => {
  clearTimeout(breakpointTimer)
  breakpointTimer = setTimeout(() => {
    const narrow = window.innerWidth < 900
    if (lastNarrow === null) {
      lastNarrow = narrow
      return
    }
    if (narrow !== lastNarrow) {
      lastNarrow = narrow
      // restart 不会清掉上一轮的状态类，先手动复位，重扫时才是干净状态
      document
        .querySelectorAll('.home-anim .vpb-box')
        .forEach((el) => el.classList.remove('show', 'dragging', 'done', 'typing'))
      pointerRef.value?.restart?.()
    }
  }, 260)
}

// 生命周期
onMounted(() => {
  homeSection = document.getElementById('section1')
  if (homeSection) homeSection.classList.add('section1--home')

  lastNarrow = window.innerWidth < 900
  window.addEventListener('resize', handleViewportChange)

  fetchPageViews()
  fetchPlayingSoft()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleViewportChange)
  clearTimeout(breakpointTimer)

  if (homeSection) {
    homeSection.classList.remove('section1--home')
    homeSection = null
  }
})
</script>

<style scoped>
.home-stage {
  position: relative;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
  padding: 104px 24px 110px;
  color: #fff;
  text-align: left;
}

/* 顶部一层极淡的青色微光，避免整页纯黑压住背景轮播 */
.home-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(900px 420px at 50% -60px, rgba(94, 196, 182, .12), transparent 70%),
    linear-gradient(180deg, rgba(3, 7, 12, .52) 0%, rgba(3, 7, 12, .24) 32%, rgba(3, 7, 12, .5) 100%);
  pointer-events: none;
}

.home-wrap {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

/* ── 首屏 ── */
.home-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero-eyebrow {
  margin: 0;
  font-size: .68rem;
  font-weight: 600;
  letter-spacing: .46em;
  color: rgba(255, 255, 255, .42);
}

.hero-title {
  width: 100%;
  max-width: 620px;
  height: 98px;
  margin: 10px 0 2px;
  cursor: default;
}

.hero-subtitle {
  width: 300px;
  height: 52px;
  margin: 0;
  border-radius: 26px;
  cursor: default;
}

.hero-hint {
  margin: 14px 0 0;
  font-size: .74rem;
  letter-spacing: .2em;
  color: rgba(255, 255, 255, .34);
}

/* ── 数据格 ── */
.stat-board {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin: 42px 0 76px;
}

.stat-tile {
  width: 100%;
  height: 96px;
  border-radius: 18px;
  cursor: default;
}

/* ── 功能入口 ── */
.feature-list {
  display: flex;
  flex-direction: column;
}

.feature-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 64px;
  padding: 52px 0;
  border-top: 1px solid rgba(255, 255, 255, .08);
}

.feature-row:first-child {
  padding-top: 4px;
  border-top: 0;
}

.feature-row.is-reverse .feature-copy {
  order: 2;
  align-items: flex-end;
}

.feature-row.is-reverse .feature-media {
  order: 1;
}

.feature-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

/* 装饰性大号序号，垫在文字后面 */
.feature-copy::before {
  position: absolute;
  top: -34px;
  left: -6px;
  z-index: 0;
  font-size: 6.4rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -.04em;
  color: rgba(255, 255, 255, .05);
  pointer-events: none;
}

.feature-row.is-reverse .feature-copy::before {
  left: auto;
  right: -4px;
}

.feature-copy--blog::before { content: "01"; }
.feature-copy--music::before { content: "02"; }
.feature-copy--tools::before { content: "03"; }

.feature-copy > .vpb-box {
  position: relative;
  z-index: 1;
}

.feature-title {
  width: 100%;
  height: 76px;
  margin: 0;
  cursor: default;
}

.feature-desc {
  width: 100%;
  max-width: 460px;
  height: 88px;
  margin: 0;
  cursor: default;
}

.feature-row.is-reverse .feature-desc {
  margin-left: auto;
}

.feature-media {
  display: block;
  width: 100%;
  height: 280px;
  border-radius: 24px;
  cursor: pointer;
  text-decoration: none;
}

/* ── 页脚提示 ── */
.home-foot {
  width: 100%;
  max-width: 460px;
  height: 62px;
  margin: 26px auto 0;
  border-radius: 15px;
  cursor: default;
}

@media (max-width: 899px) {
  .home-stage {
    padding: 92px 18px 88px;
  }

  .hero-title {
    height: 78px;
    max-width: 100%;
    margin-top: 6px;
  }

  .hero-subtitle {
    width: 250px;
    height: 46px;
    border-radius: 23px;
  }

  .stat-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 32px 0 48px;
  }

  .stat-tile {
    height: 84px;
    border-radius: 16px;
  }

  /* 五格两列排不下，最后一格（手机电量）横跨整行 */
  .stat-tile:last-child {
    grid-column: 1 / -1;
  }

  .feature-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    padding: 36px 0;
  }

  .feature-row:first-child {
    padding-top: 0;
  }

  .feature-row.is-reverse .feature-copy {
    order: 1;
    align-items: flex-start;
  }

  .feature-row.is-reverse .feature-media {
    order: 2;
  }

  .feature-copy::before {
    display: none;
  }

  .feature-title {
    height: 58px;
  }

  .feature-desc {
    max-width: 100%;
    height: 88px;
  }

  .feature-row.is-reverse .feature-desc {
    margin-left: 0;
  }

  .feature-media {
    height: 200px;
    border-radius: 18px;
  }

  .home-foot {
    height: 58px;
    margin-top: 18px;
  }
}
</style>

<style>
/* PointerBoxes 的 .vpb-inner / .vpb-text 是运行时注入的节点，scoped 命中不了，
   统一挂在 .home-anim 命名空间下，用更高优先级覆盖组件内置样式。 */
.home-anim .vpb-box .vpb-inner {
  box-sizing: border-box;
  background: rgba(12, 16, 24, .55);
  border: 1px solid rgba(255, 255, 255, .14);
  color: #fff;
  font-weight: 600;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, .32);
}

/* ── 首屏标题：透明文字块 + 完成后亮起的青色下划线 ── */
.home-anim .vpb-box.hero-title .vpb-inner {
  padding: 0 0 8px;
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.home-anim .vpb-box.hero-title .vpb-inner .vpb-text {
  font-size: clamp(2.2rem, 5vw, 3.15rem) !important;
  font-weight: 700;
  letter-spacing: .12em;
  color: #fff;
  text-shadow: 0 6px 30px rgba(0, 0, 0, .6);
}

.home-anim .vpb-box.hero-title .vpb-inner::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 8px;
  width: 76px;
  height: 3px;
  margin-left: -38px;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(94, 196, 182, 0), #5ec4b6 45%, rgba(94, 196, 182, 0));
  opacity: 0;
  transition: opacity .5s ease .2s;
}

.home-anim .vpb-box.hero-title.done .vpb-inner::after {
  opacity: .95;
}

/* ── 副标题胶囊：深色玻璃底 + 青绿描边 + 前置小圆点 ── */
.home-anim .vpb-box.hero-subtitle .vpb-inner {
  gap: 9px;
  padding: 0 18px;
  background: rgba(10, 14, 20, .58);
  border-color: rgba(94, 196, 182, .32);
  box-shadow: 0 10px 26px rgba(0, 0, 0, .3);
}

.home-anim .vpb-box.hero-subtitle .vpb-inner::before {
  content: "";
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5ec4b6;
  box-shadow: 0 0 10px rgba(94, 196, 182, .9);
}

.home-anim .vpb-box.hero-subtitle .vpb-inner .vpb-text {
  font-size: .95rem !important;
  font-weight: 500;
  letter-spacing: .14em;
  color: rgba(255, 255, 255, .86);
}

.home-anim .vpb-box.hero-subtitle.done .vpb-inner {
  border-color: rgba(94, 196, 182, .55);
  box-shadow: 0 10px 28px rgba(94, 196, 182, .16), 0 0 0 1px rgba(94, 196, 182, .2);
}

/* ── 数据格：左上角标签 + 数值，右上角一颗呼吸状态点 ── */
.home-anim .vpb-box.stat-tile .vpb-inner {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  padding: 0 20px;
  background: rgba(11, 16, 24, .52);
  border-color: rgba(255, 255, 255, .1);
  box-shadow: 0 12px 28px rgba(0, 0, 0, .28);
}

.home-anim .vpb-box.stat-tile .vpb-inner::before {
  font-size: .64rem;
  font-weight: 600;
  letter-spacing: .22em;
  color: rgba(94, 196, 182, .82);
}

.home-anim .vpb-box.stat-tile .vpb-inner::after {
  content: "";
  position: absolute;
  top: 16px;
  right: 16px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(94, 196, 182, .6);
  box-shadow: 0 0 0 4px rgba(94, 196, 182, .07);
}

.home-anim .vpb-box.stat-tile--days .vpb-inner::before { content: "已运行"; }
.home-anim .vpb-box.stat-tile--views .vpb-inner::before { content: "总访问"; }
.home-anim .vpb-box.stat-tile--sync .vpb-inner::before { content: "最近同步"; }
.home-anim .vpb-box.stat-tile--pc .vpb-inner::before { content: "电脑在听"; }
.home-anim .vpb-box.stat-tile--phone .vpb-inner::before { content: "手机电量"; }

.home-anim .vpb-box.stat-tile .vpb-inner .vpb-text {
  font-size: clamp(1.02rem, 1.35vw, 1.3rem) !important;
  font-weight: 700;
  line-height: 1.25 !important;
  letter-spacing: .01em;
  color: #fff;
  white-space: nowrap;
}

/* 组件内置的 done 态是绿色描边，这里按卡片类型压回玻璃质感 */
.home-anim .vpb-box.stat-tile.done .vpb-inner {
  border-color: rgba(255, 255, 255, .1);
  box-shadow: 0 12px 28px rgba(0, 0, 0, .28);
}

.home-anim .vpb-box.home-foot.done .vpb-inner {
  border-color: rgba(255, 255, 255, .1);
  box-shadow: none;
}

/* ── 功能标题：透明大标题 + 顶部 01 / BLOG 编号 ── */
.home-anim .vpb-box.feature-title .vpb-inner {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  padding: 0;
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.home-anim .vpb-box.feature-title .vpb-inner::before {
  margin-bottom: 6px;
  font-size: .66rem;
  font-weight: 600;
  letter-spacing: .3em;
  color: rgba(94, 196, 182, .9);
}

.home-anim .vpb-box.feature-title--blog .vpb-inner::before { content: "01 / BLOG"; }
.home-anim .vpb-box.feature-title--music .vpb-inner::before { content: "02 / MUSIC"; }
.home-anim .vpb-box.feature-title--tools .vpb-inner::before { content: "03 / TOOLS"; }

.home-anim .vpb-box.feature-title .vpb-inner .vpb-text {
  font-size: 2.35rem !important;
  font-weight: 700;
  line-height: 1.15 !important;
  letter-spacing: .05em;
  color: #fff;
  text-shadow: 0 4px 22px rgba(0, 0, 0, .55);
}

.home-anim .feature-row.is-reverse .vpb-box.feature-title .vpb-inner {
  align-items: flex-end;
}

/* ── 介绍小字：透明、逐字打出，反向行右对齐 ── */
.home-anim .vpb-box.feature-desc .vpb-inner {
  align-items: center;
  justify-content: flex-start;
  padding: 0;
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.home-anim .vpb-box.feature-desc .vpb-inner .vpb-text {
  display: block;
  width: 100%;
  font-size: .96rem !important;
  font-weight: 400;
  line-height: 1.85 !important;
  letter-spacing: .03em;
  text-align: left !important;
  color: rgba(255, 255, 255, .68);
  text-shadow: 0 1px 10px rgba(0, 0, 0, .5);
}

.home-anim .feature-row.is-reverse .vpb-box.feature-desc .vpb-inner .vpb-text {
  text-align: right !important;
}

/* ── 图片卡：随 inner 一起放大，完成后再收敛一次缩放 ── */
.home-anim .vpb-box.feature-media .vpb-inner {
  padding: 0;
  background: rgba(8, 12, 18, .6);
  border-color: rgba(255, 255, 255, .16);
  box-shadow: 0 18px 40px rgba(0, 0, 0, .35);
  transition: opacity .5s ease, box-shadow .4s ease, border-color .4s ease, transform .45s cubic-bezier(.2, .7, .3, 1);
}

.home-anim .vpb-box.feature-media .vpb-inner::before {
  content: "";
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  transform: scale(1.16);
  filter: saturate(.92);
  transition: transform 1.1s cubic-bezier(.2, .7, .3, 1), filter .5s ease;
}

.home-anim .vpb-box.feature-media.done .vpb-inner {
  border-color: rgba(255, 255, 255, .16);
  box-shadow: 0 18px 40px rgba(0, 0, 0, .35);
}

.home-anim .vpb-box.feature-media.done .vpb-inner::before {
  transform: scale(1);
}

/* 底部说明条：内容按入口区分，由伪元素承担，不占用 vpb 的打字文本 */
.home-anim .vpb-box.feature-media .vpb-inner::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 46px 22px 15px;
  background: linear-gradient(180deg, rgba(6, 10, 16, 0) 0%, rgba(6, 10, 16, .78) 100%);
  font-size: .78rem;
  font-weight: 600;
  letter-spacing: .2em;
  color: rgba(255, 255, 255, .92);
  text-align: left;
}

.home-anim .vpb-box.feature-media--blog .vpb-inner::before {
  background-image: url("/staticimage/blog.png");
}

.home-anim .vpb-box.feature-media--music .vpb-inner::before {
  background-image: url("/staticimage/music.png");
}

.home-anim .vpb-box.feature-media--tools .vpb-inner::before {
  background-image: url("/staticimage/ToyBox.png");
}

.home-anim .vpb-box.feature-media--blog .vpb-inner::after { content: "进入博客 →"; }
.home-anim .vpb-box.feature-media--music .vpb-inner::after { content: "进入音乐 →"; }
.home-anim .vpb-box.feature-media--tools .vpb-inner::after { content: "进入工具箱 →"; }

.home-anim .vpb-box.feature-media:hover .vpb-inner {
  transform: translateY(-4px);
  border-color: rgba(94, 196, 182, .5);
  box-shadow: 0 26px 54px rgba(0, 0, 0, .42), 0 0 0 1px rgba(94, 196, 182, .18);
}

.home-anim .vpb-box.feature-media:hover .vpb-inner::before {
  transform: scale(1.04);
  filter: brightness(1.05) saturate(1);
}

.home-anim .vpb-box.feature-media:focus-visible .vpb-inner {
  border-color: #5ec4b6;
  box-shadow: 0 0 0 2px rgba(94, 196, 182, .55);
}

/* ── 页脚提示 ── */
.home-anim .vpb-box.home-foot .vpb-inner {
  padding: 0 16px;
  background: rgba(12, 17, 26, .38);
  border-color: rgba(255, 255, 255, .1);
  box-shadow: none;
}

.home-anim .vpb-box.home-foot .vpb-inner .vpb-text {
  font-size: .78rem !important;
  font-weight: 500;
  line-height: 1.7 !important;
  letter-spacing: .16em;
  color: rgba(255, 255, 255, .55);
  text-align: center !important;
}

/* 首页是长页面：仅首页放开 #section1 的 100vh 裁剪，离开时由组件移除类名 */
#section1.section1--home {
  height: auto;
  min-height: 100vh;
  overflow: visible;
}

@media (max-width: 899px) {
  .home-anim .vpb-box.stat-tile .vpb-inner {
    padding: 0 14px;
  }

  .home-anim .vpb-box.stat-tile .vpb-inner::after {
    top: 12px;
    right: 12px;
  }

  .home-anim .vpb-box.stat-tile .vpb-inner .vpb-text {
    font-size: 1.04rem !important;
  }

  .home-anim .vpb-box.hero-subtitle .vpb-inner .vpb-text {
    font-size: .85rem !important;
  }

  .home-anim .vpb-box.feature-title .vpb-inner .vpb-text {
    font-size: 1.85rem !important;
  }

  .home-anim .vpb-box.feature-desc .vpb-inner .vpb-text {
    font-size: .85rem !important;
    line-height: 1.75 !important;
  }

  .home-anim .feature-row.is-reverse .vpb-box.feature-title .vpb-inner {
    align-items: flex-start;
  }

  .home-anim .feature-row.is-reverse .vpb-box.feature-desc .vpb-inner .vpb-text {
    text-align: left !important;
  }

  .home-anim .vpb-box.feature-media .vpb-inner::after {
    padding: 34px 16px 12px;
    font-size: .72rem;
  }
}
</style>
