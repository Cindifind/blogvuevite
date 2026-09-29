<template>
  <article class="srv-card">
    <header class="srv-head">
      <div class="srv-id">
        <div class="srv-logo">{{ card.initial }}</div>
        <div class="srv-names">
          <h2>{{ card.serverId }}</h2>
          <span class="srv-sub">{{ card.addrList.length }} 个地址 · 详细统计</span>
        </div>
      </div>
      <div class="srv-state">
        <span class="badge" :class="card.state">
          <i v-if="card.state === 'unknown'" class="fas fa-circle-question"></i>
          <span v-else class="dot"></span>
          {{ card.stateText }}
        </span>
        <span class="badge"><i class="fas fa-users"></i>{{ card.count }} / {{ card.max }}</span>
      </div>
    </header>

    <!-- 地址列表: 每个地址独立展示实时状态 -->
    <div class="addr-list">
      <div v-for="addr in card.addrList" :key="addr.address" class="addr-item">
        <div class="addr-logo">
          <img v-if="addr.favicon" :src="addr.favicon" alt="favicon">
          <template v-else>{{ addr.initial }}</template>
        </div>
        <div class="addr-main">
          <div class="addr-top">
            <strong>{{ addr.address }}</strong>
            <span class="badge mini" :class="addr.state">{{ addr.stateText }}</span>
          </div>
          <div class="addr-meta">
            <span><i class="fas fa-tag"></i>{{ addr.version }}</span>
            <span><i class="fas fa-users"></i>{{ addr.online }} / {{ addr.max }}</span>
            <span v-if="addr.ping !== null"><i class="fas fa-bolt"></i>{{ addr.ping }} ms</span>
          </div>
          <div v-if="addr.motd" class="addr-motd">
            <i class="fas fa-scroll"></i><span>{{ addr.motd }}</span>
          </div>
          <div v-if="addr.names.length" class="chips">
            <span v-for="(name, i) in addr.names" :key="name + '-' + i" class="chip">
              <i class="fas fa-user-circle"></i>{{ name }}
            </span>
          </div>
        </div>
      </div>
      <div v-if="!card.addrList.length" class="empty">
        <i class="fas fa-server"></i>暂无地址信息
      </div>
    </div>

    <!-- 玩家详细统计 -->
    <div class="srv-body">
      <div v-if="card.players.length" class="p-grid">
        <article v-for="(p, i) in card.players" :key="p.name + '-' + i" class="p-card">
          <div class="p-top">
            <span class="p-avatar" :style="p.avatarStyle">{{ p.initial }}</span>
            <strong>{{ p.name }}</strong>
            <span class="p-ping"><i class="fas fa-wifi"></i>{{ p.ping }} ms</span>
          </div>
          <div class="p-meta">
            <span><i class="fas fa-hourglass-half"></i>{{ p.playTime }}</span>
            <span><i class="fas fa-trophy"></i>成就 {{ p.adv }}</span>
            <span><i class="fas fa-skull"></i>死亡 {{ p.deaths }}</span>
            <span><i class="fas fa-crosshairs"></i>击杀 {{ p.kills }}</span>
            <span><i class="fas fa-earth-asia"></i>{{ p.dimension }}</span>
          </div>
        </article>
      </div>
      <div v-else class="empty">
        <i class="fas fa-user-slash"></i>{{ card.playerStats ? '暂无玩家在线' : '暂无玩家统计数据' }}
      </div>
    </div>

    <footer class="srv-foot">
      <span class="ts"><i class="fas fa-clock-rotate-left"></i>{{ updatedText }}</span>
    </footer>
  </article>
</template>

<script setup>
defineProps({
  card: { type: Object, required: true },
  updatedText: { type: String, default: '' },
})
</script>

<style scoped>
/* 邮箱详情卡片 */
.srv-card,
.srv-card * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.srv-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 18px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: linear-gradient(160deg, rgba(148, 163, 184, 0.09) 0%, rgba(148, 163, 184, 0.03) 58%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.srv-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.srv-id {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.srv-logo {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #a5f3fc;
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.22), rgba(99, 102, 241, 0.3));
  border: 1px solid rgba(34, 211, 238, 0.3);
  overflow: hidden;
}

.srv-names {
  min-width: 0;
}

.srv-names h2 {
  font-size: 1.05rem;
  font-weight: 700;
  word-break: break-all;
  line-height: 1.35;
}

.srv-sub {
  display: inline-block;
  margin-top: 2px;
  color: var(--dim);
  font-size: 0.72rem;
  letter-spacing: 0.07em;
}

.srv-state {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--dim);
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge i {
  font-size: 0.72rem;
  opacity: 0.85;
}

.badge.mini {
  padding: 3px 9px;
  font-size: 0.7rem;
}

.badge.online {
  color: #6ee7b7;
  border-color: rgba(52, 211, 153, 0.35);
  background: rgba(52, 211, 153, 0.08);
}

.badge.offline {
  color: #fda4af;
  border-color: rgba(251, 113, 133, 0.35);
  background: rgba(251, 113, 133, 0.08);
}

.badge.unknown {
  color: #fcd34d;
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(251, 191, 36, 0.08);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.badge.online .dot {
  animation: pulse 1.8s ease-out infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.5); }
  70% { box-shadow: 0 0 0 9px rgba(52, 211, 153, 0); }
  100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
}

/* ---------- 地址列表 ---------- */
.addr-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.addr-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
}

.addr-logo {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #a5f3fc;
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.22), rgba(99, 102, 241, 0.3));
  border: 1px solid rgba(34, 211, 238, 0.3);
  overflow: hidden;
}

.addr-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.addr-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.addr-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.addr-top strong {
  font-size: 0.92rem;
  font-weight: 700;
  word-break: break-all;
  line-height: 1.4;
}

.addr-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  color: var(--dim);
  font-size: 0.78rem;
}

.addr-meta i {
  color: var(--accent);
  margin-right: 5px;
  opacity: 0.8;
}

.addr-motd {
  display: flex;
  gap: 6px;
  color: #b7c5da;
  font-size: 0.79rem;
  word-break: break-all;
}

.addr-motd i {
  color: var(--accent);
  opacity: 0.8;
  margin-top: 3px;
}

/* ---------- 玩家详细统计 ---------- */
.p-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.p-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: rgba(7, 11, 20, 0.45);
}

.p-top {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

/* 玩家头像: 背景色由内联样式按名字哈希生成 */
.p-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #eaf6ff;
}

.p-top strong {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-ping {
  flex-shrink: 0;
  color: var(--dim);
  font-size: 0.77rem;
  font-variant-numeric: tabular-nums;
}

.p-ping i {
  color: var(--accent-2);
  margin-right: 4px;
  opacity: 0.85;
}

.p-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 15px;
  color: #b7c5da;
  font-size: 0.79rem;
}

.p-meta i {
  color: var(--accent-2);
  margin-right: 6px;
  opacity: 0.9;
}

/* ---------- 玩家名字胶囊 ---------- */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  background: rgba(34, 211, 238, 0.07);
  color: #a5f3fc;
  font-size: 0.82rem;
  font-weight: 500;
}

.chip i {
  font-size: 0.72rem;
  opacity: 0.6;
}

/* ---------- 空状态块 ---------- */
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

/* ---------- 卡片底部 ---------- */
.srv-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-soft);
  color: var(--dim);
  font-size: 0.78rem;
}

.srv-foot .ts i {
  margin-right: 6px;
  opacity: 0.7;
}
</style>
