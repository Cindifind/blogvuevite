<template>
  <article class="srv-card">
    <header class="srv-head">
      <div class="srv-id">
        <div class="srv-logo">
          <img v-if="card.favicon" :src="card.favicon" alt="favicon">
          <template v-else>{{ card.initial }}</template>
        </div>
        <div class="srv-names">
          <h2>{{ card.address }}</h2>
          <span class="srv-sub">地址查询 · 仅玩家名单</span>
        </div>
      </div>
      <div class="srv-state">
        <span class="badge" :class="card.state">
          <i v-if="card.state === 'unknown'" class="fas fa-circle-question"></i>
          <span v-else class="dot"></span>
          {{ card.stateText }}
        </span>
        <span class="badge"><i class="fas fa-users"></i>{{ card.online }} / {{ card.max }}</span>
        <span v-if="card.ping !== null" class="badge"><i class="fas fa-bolt"></i>{{ card.ping }} ms</span>
      </div>
    </header>
    <div class="srv-info">
      <span><i class="fas fa-tag"></i>{{ card.version }}</span>
      <span v-if="card.motd" class="motd-text"><i class="fas fa-scroll"></i>{{ card.motd }}</span>
    </div>
    <div class="srv-body">
      <div v-if="card.loading && !card.hasData" class="empty">
        <i class="fas fa-spinner fa-pulse"></i>正在查询…
      </div>
      <div v-else-if="card.error" class="empty error">
        <i class="fas fa-circle-exclamation"></i>{{ card.error }}
      </div>
      <div v-else-if="card.names.length" class="chips">
        <span v-for="(name, i) in card.names" :key="name + '-' + i" class="chip">
          <i class="fas fa-user-circle"></i>{{ name }}
        </span>
      </div>
      <div v-else class="empty">
        <i class="fas fa-user-slash"></i>暂无玩家在线
      </div>
    </div>
    <footer class="srv-foot">
      <span class="ts"><i class="fas fa-clock-rotate-left"></i>{{ card.updatedText }}</span>
      <button class="btn mini" type="button" @click="$emit('remove', card.address)">
        <i class="fas fa-xmark"></i> 移除
      </button>
    </footer>
  </article>
</template>

<script setup>
defineProps({
  card: { type: Object, required: true },
})

defineEmits(['remove'])
</script>

<style scoped>
/* 地址查询结果卡片 */
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

.srv-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
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

/* ---------- 卡片信息行 ---------- */
.srv-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  color: var(--dim);
  font-size: 0.8rem;
}

.srv-info i {
  color: var(--accent);
  margin-right: 6px;
  opacity: 0.8;
}

.srv-info .motd-text {
  word-break: break-all;
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

/* 卡片内按钮 */
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

.btn.mini {
  padding: 5px 13px;
  font-size: 0.78rem;
  gap: 6px;
}
</style>
