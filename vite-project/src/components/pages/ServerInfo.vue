<template>
  <div class="serverinfo-page">
    <div class="page">
      <!-- 顶部栏: 品牌 + 智能查询（邮箱 / 服务器地址） -->
      <header class="topbar">
        <div class="brand">
          <div class="brand-logo"><i class="fas fa-server"></i></div>
          <div>
            <h1>服务器状态中心</h1>
            <p>Server Status Hub</p>
          </div>
        </div>
        <form class="search" @submit.prevent="handleQuery">
          <i class="fas fa-magnifying-glass"></i>
          <input
            v-model="queryInput"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="输入邮箱查询服务器，或输入服务器地址查询状态"
          >
          <button type="submit" :disabled="loading || !queryInput.trim()">
            <i class="fas fa-magnifying-glass"></i> 查询
          </button>
        </form>
      </header>

      <!-- 信息条 -->
      <div class="rail">
        <span class="hint">
          <i class="fas fa-circle-info"></i>
          <template v-if="appliedEmail">
            正在查看 <b>{{ appliedEmail }}</b> 的服务器（{{ cards.length }} 台）
          </template>
          <template v-else>
            全部服务器 <b>{{ allCards.length }}</b> 台 · 点击"详情"查看实时状态
          </template>
        </span>
        <div class="rail-right">
          <span v-if="pageError && hasMainData" class="rail-error">
            <i class="fas fa-triangle-exclamation"></i>刷新失败
          </span>
          <span class="countdown">{{ countdown }}s</span>
          <button v-if="appliedEmail" class="btn" type="button" @click="backToOverview">
            <i class="fas fa-list"></i> 返回总览
          </button>
          <button
            v-if="!appliedEmail && isLoggedIn"
            class="btn accent"
            type="button"
            @click="openAddDialog"
          >
            <i class="fas fa-plus"></i> 添加服务器
          </button>
          <button class="btn" type="button" :disabled="loading" @click="refreshAll">
            <i class="fas fa-rotate-right"></i> 立即刷新
          </button>
        </div>
      </div>

      <!-- 有旧数据时刷新失败的提示 -->
      <div v-if="pageError && hasMainData" class="alert">
        <i class="fas fa-triangle-exclamation"></i>刷新失败：{{ pageError }}
      </div>

      <!-- 服务器卡片网格 -->
      <TransitionGroup name="card" tag="main" class="grid">
        <!-- 总览模式: 服务器记录卡片 -->
        <ServerInfoOverviewCard
          v-for="card in allCards"
          :key="card.key"
          :card="card"
          :is-logged-in="isLoggedIn"
          :highlight="highlightKey === card.key"
          @detail="openDetail"
          @edit="openEditDialog"
          @delete="confirmDelete"
        />

        <!-- 邮箱模式: 详细状态卡片 -->
        <ServerInfoDetailCard
          v-for="card in cards"
          :key="card.key"
          :card="card"
          :updated-text="updatedText"
        />

        <!-- 地址查询结果卡片 -->
        <ServerInfoAddressCard
          v-for="card in addressCards"
          :key="card.key"
          :card="card"
          @remove="removeAddressCard"
        />

        <!-- 空态 / 加载 / 错误 -->
        <div
          v-if="emptyState"
          key="__empty"
          class="empty grid-empty"
          :class="{ error: emptyState.error }"
        >
          <i :class="emptyState.icon"></i>{{ emptyState.text }}
        </div>
      </TransitionGroup>

      <!-- 页脚 -->
      <footer class="page-foot">
        <span><i class="fas fa-database"></i>数据来源 muqingxi.com:2345 · selectAllMCServe / selectMCServeByEmail / server</span>
        <span><i class="fas fa-clock"></i>每 30 秒自动刷新 · 地址查询仅展示玩家名单</span>
      </footer>
    </div>

    <!-- 添加 / 编辑服务器弹窗 -->
    <ServerInfoManageDialog
      v-model="showManageDialog"
      :mode="manageMode"
      :initial-server-id="manageInitial.serverId"
      :initial-addresses="manageInitial.addresses"
      :submitting="submitting"
      @submit="submitManage"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ServerInfoOverviewCard from '../component/ServerInfoOverviewCard.vue'
import ServerInfoDetailCard from '../component/ServerInfoDetailCard.vue'
import ServerInfoAddressCard from '../component/ServerInfoAddressCard.vue'
import ServerInfoManageDialog from '../component/ServerInfoManageDialog.vue'
import { authFetch } from '../../utils/api'
import { useUserStore } from '../../stores/user'

// ================= 配置 =================
const API_BASE = 'https://muqingxi.com:2345/proxy'
const POLL_INTERVAL = 30      // 轮询秒数
const REQUEST_TIMEOUT = 15000 // 单次请求超时

const STATE_TEXT = { online: '在线', offline: '离线', unknown: '未知' }

// ================= 状态 =================
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)

const queryInput = ref('')      // 搜索框（邮箱或服务器地址）
const appliedEmail = ref('')    // 当前生效的查询邮箱；为空表示总览模式
const servers = ref([])         // 邮箱模式: selectMCServeByEmail 数据
const allServers = ref([])      // 总览模式: selectAllMCServe 数据
const addressRecords = ref([])  // 地址搜索结果（server?address=）
const pageError = ref('')       // 最近一次主数据请求错误（有旧数据时仅提示不清空）
const loading = ref(false)
const countdown = ref(POLL_INTERVAL)
const updatedAt = ref(0)
const highlightKey = ref('')    // 搜索命中的卡片 key（flash 高亮）

// 管理弹窗状态
const showManageDialog = ref(false)
const manageMode = ref('add')   // 'add' | 'edit'
const manageInitial = ref({ serverId: '', addresses: [] })
const submitting = ref(false)

let timer = null
let highlightTimer = null

// ================= 工具函数 =================
function hueOf(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}

function formatTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

// 从 playerInfo.favicon 提取可用的 base64 图源
function faviconOf(info) {
  const f = info && info.favicon
  if (!f || !f.base64) return null
  const b64 = String(f.base64)
  return b64.startsWith('data:image')
    ? b64
    : `data:image/${String(f.format || 'png').toLowerCase()};base64,${b64}`
}

// 归一化接口返回的单条服务器记录（selectMCServeByEmail）
function normalizeServer(item) {
  const serverId = (item && item.serverId != null && String(item.serverId).trim())
    ? String(item.serverId)
    : '未知服务器'
  const serverInfo = (item && Array.isArray(item.serverInfo))
    ? item.serverInfo.map(si => ({
        address: (si && si.address != null && String(si.address).trim()) ? String(si.address) : '未知地址',
        info: (si && si.playerInfo && typeof si.playerInfo === 'object') ? si.playerInfo : null,
      }))
    : []
  // serverPlayerInfo.serverPlayerInfo 为玩家统计体（兼容直接返回统计体的情况）
  let playerStats = null
  const spi = item && item.serverPlayerInfo
  if (spi && typeof spi === 'object') {
    playerStats = (spi.serverPlayerInfo && typeof spi.serverPlayerInfo === 'object')
      ? spi.serverPlayerInfo
      : (spi.players ? spi : null)
  }
  return { serverId, serverInfo, playerStats }
}

// 清洗地址列表：去除首尾空白与残留引号，过滤空串及 '[]' 这类脏元素
function cleanAddressList(list) {
  return list
    .map(v => String(v).trim().replace(/^["']+|["']+$/g, '').trim())
    .filter(v => v && !/^\[\s*\]$/.test(v))
}

// 解析 selectAllMCServe 的 serverAddress 字段，兼容三类格式：
// 1) JSON 数组字符串     '["a","b"]' / '[]'
// 2) Java List.toString  '[a, b]'（元素不带引号，JSON.parse 会失败，直接按逗号切分会把方括号带进地址里）
// 3) 普通分隔字符串       'a,b' / 'a\nb'
function parseAddresses(raw) {
  if (Array.isArray(raw)) return cleanAddressList(raw)
  if (typeof raw !== 'string') return []
  let text = raw.trim()
  if (!text) return []

  if (text.startsWith('[')) {
    // 先按严格 JSON 解析；失败说明是 Java List.toString 风格，剥掉最外层方括号再切分
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return cleanAddressList(parsed)
    } catch {
      if (text.endsWith(']')) text = text.slice(1, -1)
    }
  }

  return cleanAddressList(text.split(/[,\n]/))
}

// ================= 展示数据 =================
const updatedText = computed(() => (updatedAt.value ? `更新于 ${formatTime(updatedAt.value)}` : '尚未更新'))

const hasMainData = computed(() =>
  appliedEmail.value ? servers.value.length > 0 : allServers.value.length > 0
)

// 总览模式卡片（selectAllMCServe，已归一化）
const allCards = computed(() => allServers.value)

// 邮箱模式卡片（selectMCServeByEmail）
const cards = computed(() => servers.value.map(server => {
  // 地址列表
  const addrList = server.serverInfo.map(si => {
    const info = si.info
    const rawNames = Array.isArray(info?.players?.list)
      ? info.players.list
      : (Array.isArray(info?.players?.sample) ? info.players.sample.map(p => p && p.name) : [])
    const names = rawNames.filter(Boolean).map(String)
    const state = !info ? 'unknown' : ((info.status && info.status.code) === 'ONLINE' ? 'online' : 'offline')
    return {
      address: si.address,
      initial: si.address.slice(0, 1).toUpperCase() || '?',
      favicon: faviconOf(info),
      state,
      stateText: STATE_TEXT[state],
      version: (info?.version?.name) ? String(info.version.name) : '—',
      online: (info && info.players && typeof info.players.online === 'number') ? info.players.online : names.length,
      max: (info && info.players && typeof info.players.max === 'number') ? info.players.max : '—',
      ping: (info && info.ping && typeof info.ping.latency === 'number') ? Math.round(info.ping.latency) : null,
      motd: (info?.motd?.clean || info?.motd?.raw) ? String(info.motd.clean || info.motd.raw) : '',
      names,
    }
  })

  // 整卡状态：优先用玩家统计的 online，否则按地址聚合
  let state = 'unknown'
  const ps = server.playerStats
  if (ps && typeof ps.online === 'boolean') {
    state = ps.online ? 'online' : 'offline'
  } else if (addrList.some(a => a.state === 'online')) {
    state = 'online'
  } else if (addrList.length && addrList.every(a => a.state === 'offline')) {
    state = 'offline'
  }

  // 人数：优先玩家统计，否则各地址相加
  let count
  let max
  if (ps && typeof ps.count === 'number') {
    count = ps.count
    max = ps.maxPlayers ?? '—'
  } else {
    count = addrList.reduce((sum, a) => sum + (typeof a.online === 'number' ? a.online : 0), 0)
    const maxVals = addrList.map(a => a.max).filter(v => typeof v === 'number')
    max = maxVals.length ? Math.max(...maxVals) : '—'
  }

  // 玩家详细统计
  const players = (ps && Array.isArray(ps.players) ? ps.players : []).map(p => {
    const name = (p && p.name) ? String(p.name) : '未知玩家'
    const h = hueOf(name)
    return {
      name,
      initial: (name.slice(0, 1) || '?').toUpperCase(),
      avatarStyle: {
        background: `linear-gradient(135deg, hsl(${h} 72% 44% / 0.9), hsl(${h} 72% 28% / 0.95))`,
        border: `1px solid hsl(${h} 72% 60% / 0.35)`,
      },
      ping: (p && p.live && p.live.ping != null) ? p.live.ping : '—',
      playTime: (p && p.playTime && p.playTime.display) || '—',
      adv: (p && p.advancements)
        ? `${p.advancements.completed ?? '—'} / ${p.advancements.total ?? '—'}`
        : '—',
      deaths: (p && p.stats && p.stats.deaths != null) ? p.stats.deaths : '—',
      kills: (p && p.stats && p.stats.mobKills != null) ? p.stats.mobKills : '—',
      dimension: String((p && p.live && p.live.dimension) || '—').replace('minecraft:', ''),
    }
  })

  return {
    key: `d:${server.serverId}`,
    serverId: server.serverId,
    initial: (server.serverId.slice(0, 1) || '?').toUpperCase(),
    addrList,
    players,
    playerStats: ps,
    state,
    stateText: STATE_TEXT[state],
    count,
    max,
  }
}))

// 地址查询卡片（server?address=）
const addressCards = computed(() => addressRecords.value.map(rec => {
  const d = rec.data || null
  const rawNames = Array.isArray(d?.players?.list)
    ? d.players.list
    : (Array.isArray(d?.players?.sample) ? d.players.sample.map(p => p && p.name) : [])
  const names = rawNames.filter(Boolean).map(String)
  let state = 'unknown'
  if (d) {
    state = ((d.status && d.status.code) === 'ONLINE') ? 'online' : 'offline'
  } else if (rec.error) {
    state = 'offline'
  }
  const stateText = (rec.loading && !d) ? '查询中' : ((rec.error && !d) ? '查询失败' : STATE_TEXT[state])
  return {
    key: `s:${rec.key}`,
    address: rec.address,
    initial: rec.address.slice(0, 1).toUpperCase() || '?',
    favicon: faviconOf(d),
    state,
    stateText,
    version: (d?.version?.name) ? String(d.version.name) : '—',
    online: (d && d.players && typeof d.players.online === 'number') ? d.players.online : names.length,
    max: (d && d.players && typeof d.players.max === 'number') ? d.players.max : '—',
    ping: (d && d.ping && typeof d.ping.latency === 'number') ? Math.round(d.ping.latency) : null,
    motd: (d?.motd?.clean || d?.motd?.raw) ? String(d.motd.clean || d.motd.raw) : '',
    names,
    hasData: !!d,
    error: rec.error,
    loading: rec.loading,
    updatedText: rec.updatedAt ? `更新于 ${formatTime(rec.updatedAt)}` : '尚未更新',
  }
}))

const emptyState = computed(() => {
  const mainCount = appliedEmail.value ? cards.value.length : allCards.value.length
  if (mainCount + addressCards.value.length) return null
  if (loading.value) return { icon: 'fas fa-spinner fa-pulse', text: '正在获取服务器列表…', error: false }
  if (pageError.value) return { icon: 'fas fa-triangle-exclamation', text: `服务器列表获取失败：${pageError.value}`, error: true }
  if (appliedEmail.value) return { icon: 'fas fa-inbox', text: '该邮箱下暂无服务器', error: false }
  return { icon: 'fas fa-server', text: '暂无服务器记录，可在右上角"添加服务器"新增', error: false }
})

// ================= 数据获取 =================
let mainSeq = 0 // 主数据请求序号：防止旧响应覆盖新模式数据

// 统一解析响应：HTTP 状态 + 业务 code / success 校验
async function parseResponse(res) {
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error(`HTTP ${res.status}：响应不是有效 JSON`)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (data && data.success === false) throw new Error(data.errorMessage || data.message || '查询失败')
  if (data && data.code != null && data.code !== 200) throw new Error(data.errorMessage || data.message || `接口返回 code=${data.code}`)
  return data
}

// 总览模式：全部服务器记录（selectAllMCServe）
async function fetchAllServers() {
  const seq = ++mainSeq
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/selectAllMCServe`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    const data = await parseResponse(res)
    if (seq !== mainSeq) return
    allServers.value = (Array.isArray(data.data) ? data.data : []).map(item => {
      const serverId = (item && item.serverId != null && String(item.serverId).trim())
        ? String(item.serverId)
        : '未知服务器'
      const email = (item && item.email != null && String(item.email).trim()) ? String(item.email) : ''
      return {
        key: `o:${serverId}:${email}`,
        serverId,
        email,
        addresses: parseAddresses(item && item.serverAddress),
        initial: (serverId.slice(0, 1) || '?').toUpperCase(),
      }
    })
    pageError.value = ''
    updatedAt.value = Date.now()
  } catch (err) {
    if (seq !== mainSeq) return
    pageError.value = (err && err.name === 'TimeoutError') ? '请求超时' : ((err && err.message) || String(err))
    console.warn('[ServerInfo] 获取全部服务器失败:', err)
  } finally {
    if (seq === mainSeq) {
      loading.value = false
      countdown.value = POLL_INTERVAL
    }
  }
}

// 邮箱模式：该邮箱下的服务器详细状态（selectMCServeByEmail）
async function fetchServers() {
  const target = appliedEmail.value
  if (!target) return
  const seq = ++mainSeq
  loading.value = true
  try {
    const url = `${API_BASE}/selectMCServeByEmail?email=${encodeURIComponent(target)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    const data = await parseResponse(res)
    if (seq !== mainSeq) return
    servers.value = (Array.isArray(data.data) ? data.data : []).map(normalizeServer)
    pageError.value = ''
    updatedAt.value = Date.now()
  } catch (err) {
    if (seq !== mainSeq) return
    pageError.value = (err && err.name === 'TimeoutError') ? '请求超时' : ((err && err.message) || String(err))
    console.warn('[ServerInfo] 获取服务器列表失败:', err)
  } finally {
    if (seq === mainSeq) {
      loading.value = false
      countdown.value = POLL_INTERVAL
    }
  }
}

// 地址查询：基础状态，仅玩家名单（server?address=）
async function fetchAddress(address) {
  const key = address.toLowerCase()
  if (!addressRecords.value.some(r => r.key === key)) {
    addressRecords.value.push({ key, address, data: null, error: '', loading: true, updatedAt: 0 })
  }
  // 从响应式数组中取回代理引用再修改：直接改原始对象不会触发视图更新（会一直停在"查询中"）
  const rec = addressRecords.value.find(r => r.key === key)
  rec.loading = true
  rec.error = ''
  try {
    const res = await fetch(`${API_BASE}/server?address=${encodeURIComponent(address)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    const data = await parseResponse(res)
    rec.data = data
  } catch (err) {
    rec.error = (err && err.name === 'TimeoutError') ? '请求超时' : ((err && err.message) || String(err))
    console.warn('[ServerInfo] 地址查询失败:', err)
  } finally {
    rec.loading = false
    rec.updatedAt = Date.now()
  }
}

// 移除地址查询卡片
function removeAddressCard(address) {
  addressRecords.value = addressRecords.value.filter(rec => rec.address !== address)
}

// 手动"立即刷新"：当前模式主数据 + 全部地址卡片
function refreshAll() {
  if (appliedEmail.value) fetchServers()
  else fetchAllServers()
  addressRecords.value.forEach(rec => fetchAddress(rec.address))
}

// 搜索：含 @ 视为邮箱查询，否则视为服务器地址查询
function handleQuery() {
  const target = queryInput.value.trim()
  if (!target) return
  if (target.includes('@')) {
    if (target !== appliedEmail.value) {
      appliedEmail.value = target
      servers.value = []
      pageError.value = ''
    }
    router.replace({ path: route.path, query: { email: target } }).catch(() => {})
    fetchServers()
    return
  }
  // 地址查询：命中总览记录时高亮对应卡片
  const match = allCards.value.find(c => c.addresses.some(a => a.toLowerCase() === target.toLowerCase()))
  fetchAddress(target)
  if (match) flashCard(match.key)
}

// 高亮定位卡片（搜索命中时）
async function flashCard(key) {
  highlightKey.value = key
  await nextTick()
  const el = Array.from(document.querySelectorAll('.ov-card')).find(n => n.dataset.key === key)
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (highlightTimer) clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => { highlightKey.value = '' }, 1800)
}

// 总览卡片"详情"：有邮箱跳转邮箱详情模式，否则按地址查询实时状态
function openDetail(card) {
  if (card.email) {
    router.push({ path: route.path, query: { email: card.email } }).catch(() => {})
    return
  }
  if (card.addresses.length) {
    card.addresses.forEach(addr => fetchAddress(addr))
    ElMessage.info('该服务器未绑定邮箱，已按地址查询实时状态')
    return
  }
  ElMessage.warning('该服务器未绑定邮箱，且暂无可用地址')
}

// 返回总览模式
function backToOverview() {
  appliedEmail.value = ''
  servers.value = []
  pageError.value = ''
  queryInput.value = ''
  highlightKey.value = ''
  if (highlightTimer) {
    clearTimeout(highlightTimer)
    highlightTimer = null
  }
  router.replace({ path: route.path }).catch(() => {})
  fetchAllServers()
}

// ================= 管理（添加 / 编辑 / 删除） =================
function openAddDialog() {
  manageMode.value = 'add'
  manageInitial.value = { serverId: '', addresses: [] }
  showManageDialog.value = true
}

function openEditDialog(card) {
  manageMode.value = 'edit'
  manageInitial.value = { serverId: card.serverId, addresses: [...card.addresses] }
  showManageDialog.value = true
}

// 弹窗组件提交（表单值已在弹窗内 trim/过滤，这里再做兜底校验与接口调用）
async function submitManage({ serverId, addresses }) {
  const id = String(serverId || '').trim()
  if (!id) {
    ElMessage.warning('请填写服务器 ID')
    return
  }
  const list = (Array.isArray(addresses) ? addresses : []).map(s => String(s).trim()).filter(Boolean)
  if (!list.length) {
    ElMessage.warning('请至少填写一个服务器地址')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const action = manageMode.value === 'add' ? 'insertMCServe' : 'updateMCServe'
    const res = await authFetch(`${API_BASE}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ serverId: id, serverAddress: list }),
    })
    await parseResponse(res)
    ElMessage.success(manageMode.value === 'add' ? `已添加服务器 ${id}` : `已更新服务器 ${id}`)
    showManageDialog.value = false
    fetchAllServers()
  } catch (err) {
    ElMessage.error((err && err.message) || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function confirmDelete(card) {
  try {
    await ElMessageBox.confirm(`确定要删除服务器「${card.serverId}」吗？此操作不可恢复。`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return // 用户取消
  }
  try {
    const res = await authFetch(`${API_BASE}/deleteMCServe?serverId=${encodeURIComponent(card.serverId)}`, { method: 'POST' })
    await parseResponse(res)
    ElMessage.success(`已删除服务器 ${card.serverId}`)
    fetchAllServers()
  } catch (err) {
    ElMessage.error((err && err.message) || '删除失败')
  }
}

// ================= 轮询 =================
function tick() {
  if (loading.value) return
  countdown.value -= 1
  if (countdown.value <= 0) {
    countdown.value = POLL_INTERVAL
    refreshAll()
  }
}

// ================= 生命周期 =================
// 地址栏 email 变化（详情跳转 / 后退前进）时切换模式
watch(() => route.query.email, val => {
  const target = typeof val === 'string' ? val.trim() : ''
  if (target === appliedEmail.value) return
  if (target) {
    appliedEmail.value = target
    queryInput.value = target
    servers.value = []
    pageError.value = ''
    fetchServers()
  } else {
    appliedEmail.value = ''
    servers.value = []
    pageError.value = ''
    queryInput.value = ''
    fetchAllServers()
  }
})

onMounted(() => {
  // email 参数非空 → 邮箱详情模式；为空 → 默认总览全部服务器
  const queryEmail = typeof route.query.email === 'string' ? route.query.email.trim() : ''
  if (queryEmail) {
    queryInput.value = queryEmail
    appliedEmail.value = queryEmail
    fetchServers()
  } else {
    fetchAllServers()
  }
  timer = setInterval(tick, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (highlightTimer) {
    clearTimeout(highlightTimer)
    highlightTimer = null
  }
})
</script>

<style scoped>
/* ================= 页面容器（原独立页 body 样式迁移） ================= */
.serverinfo-page {
  --panel: rgba(148, 163, 184, 0.055);
  --panel-2: rgba(148, 163, 184, 0.09);
  --border: rgba(148, 163, 184, 0.16);
  --border-soft: rgba(148, 163, 184, 0.10);
  --text: #e6edf7;
  --dim: #8b9bb4;
  --accent: #22d3ee;
  --accent-2: #818cf8;
  --green: #34d399;
  --red: #fb7185;
  --amber: #fbbf24;
  --radius: 20px;

  position: relative;
  z-index: 2;
  width: 100%;
  min-height: calc(100vh - 100px);
  color: var(--text);
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.serverinfo-page,
.serverinfo-page * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 30px 20px 64px;
}

/* ---------- 顶部栏 ---------- */
.topbar {
  display: flex;
  flex-wrap: wrap;
  gap: 18px 24px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-logo {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 1.3rem;
  color: #04121a;
  background: linear-gradient(135deg, #22d3ee 0%, #60a5fa 55%, #818cf8 100%);
  box-shadow: 0 10px 26px rgba(34, 211, 238, 0.28);
  flex-shrink: 0;
}

.brand h1 {
  font-size: 1.32rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  background: linear-gradient(90deg, #f0f9ff 0%, #a5f3fc 45%, #c7d2fe 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand p {
  margin-top: 3px;
  color: var(--dim);
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

/* ---------- 查询框 ---------- */
.search {
  flex: 1 1 380px;
  max-width: 560px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 6px 6px 18px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(8, 13, 24, 0.82);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search:focus-within {
  border-color: rgba(34, 211, 238, 0.65);
  box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.12);
}

.search > i {
  color: var(--dim);
  font-size: 0.9rem;
}

.search input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.92rem;
}

.search input::placeholder {
  color: #5b6b84;
}

.search button {
  flex-shrink: 0;
  padding: 10px 24px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  color: #04121a;
  background: linear-gradient(135deg, #22d3ee, #60a5fa);
  transition: filter 0.15s, transform 0.1s;
}

.search button:hover:not(:disabled) {
  filter: brightness(1.12);
}

.search button:active:not(:disabled) {
  transform: scale(0.97);
}

.search button:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ---------- 信息条 ---------- */
.rail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  margin-bottom: 18px;
  padding: 11px 18px;
  border: 1px dashed var(--border);
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.03);
  color: var(--dim);
  font-size: 0.84rem;
}

.rail b {
  color: #a5f3fc;
  font-weight: 600;
}

.rail .hint i {
  color: var(--accent);
  margin-right: 7px;
}

.rail-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rail-error {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #fda4af;
  font-size: 0.79rem;
  font-weight: 600;
}

.countdown {
  padding: 4px 13px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--text);
  font-size: 0.79rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 17px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--text);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.btn:hover:not(:disabled) {
  border-color: rgba(34, 211, 238, 0.5);
  color: #a5f3fc;
  background: rgba(34, 211, 238, 0.07);
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn.accent {
  border-color: rgba(34, 211, 238, 0.45);
  background: rgba(34, 211, 238, 0.12);
  color: #a5f3fc;
}

.btn.accent:hover:not(:disabled) {
  background: rgba(34, 211, 238, 0.2);
}

/* ---------- 刷新失败提示（保留旧数据） ---------- */
.alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 16px;
  margin-bottom: 14px;
  border: 1px dashed rgba(251, 113, 133, 0.45);
  border-radius: 12px;
  background: rgba(251, 113, 133, 0.06);
  color: #fda4af;
  font-size: 0.84rem;
}

/* ---------- 服务器卡片网格 ---------- */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(440px, 100%), 1fr));
  gap: 18px;
  align-items: start;
}

.grid .grid-empty {
  grid-column: 1 / -1;
}

.card-enter-active {
  animation: cardIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- 空 / 错误状态块 ---------- */
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 16px 14px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  color: var(--dim);
  font-size: 0.84rem;
  text-align: center;
}

.empty.error {
  color: #fda4af;
  border-color: rgba(251, 113, 133, 0.35);
  background: rgba(251, 113, 133, 0.05);
}

/* ---------- 页面页脚 ---------- */
.page-foot {
  margin-top: 34px;
  padding-top: 18px;
  border-top: 1px solid var(--border-soft);
  color: var(--dim);
  font-size: 0.78rem;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  justify-content: space-between;
}

.page-foot i {
  color: var(--accent);
  margin-right: 6px;
  opacity: 0.75;
}

@media (max-width: 720px) {
  .page { padding: 22px 14px 48px; }
  .topbar { flex-direction: column; align-items: stretch; }
  .search { max-width: none; }
  .grid { grid-template-columns: 1fr; }
  .brand h1 { font-size: 1.15rem; }
}
</style>
