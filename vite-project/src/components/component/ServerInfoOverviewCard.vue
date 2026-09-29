<template>
  <article
    class="ov-card"
    :class="{ flash: highlight }"
    :data-key="card.key"
  >
    <header class="ov-head">
      <div class="srv-id">
        <div class="srv-logo">{{ card.initial }}</div>
        <div class="srv-names">
          <h2>{{ card.serverId }}</h2>
          <span class="srv-sub">服务器记录</span>
        </div>
      </div>
      <div class="ov-actions">
        <button class="btn mini" type="button" @click="$emit('detail', card)">
          <i class="fas fa-circle-info"></i> 详情
        </button>
        <button v-if="isLoggedIn" class="btn mini" type="button" @click="$emit('edit', card)">
          <i class="fas fa-pen"></i> 编辑
        </button>
        <button v-if="isLoggedIn" class="btn mini danger" type="button" @click="$emit('delete', card)">
          <i class="fas fa-trash"></i> 删除
        </button>
      </div>
    </header>
    <div class="ov-mail">
      <i class="fas fa-envelope"></i>
      <button class="mail-link" type="button" @click="$emit('detail', card)">
        {{ card.email || '未绑定邮箱' }}
      </button>
    </div>
    <div class="ov-addrs">
      <span class="lbl"><i class="fas fa-network-wired"></i>地址</span>
      <template v-if="card.addresses.length">
        <span v-for="addr in card.addresses" :key="addr" class="addr-chip">{{ addr }}</span>
      </template>
      <span v-else class="no-addr">暂无地址</span>
    </div>
  </article>
</template>

<script setup>
defineProps({
  card: { type: Object, required: true },
  isLoggedIn: { type: Boolean, default: false },
  highlight: { type: Boolean, default: false },
})

defineEmits(['detail', 'edit', 'delete'])
</script>

<style scoped>
/* 总览服务器记录卡片 */
.ov-card,
.ov-card * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.ov-card {
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: linear-gradient(160deg, rgba(148, 163, 184, 0.09) 0%, rgba(148, 163, 184, 0.03) 58%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.ov-card.flash {
  animation: flashRing 1.6s ease-out 1;
}

@keyframes flashRing {
  0% {
    border-color: rgba(34, 211, 238, 0.95);
    box-shadow: 0 0 0 5px rgba(34, 211, 238, 0.22);
  }
  100% {
    border-color: var(--border);
    box-shadow: none;
  }
}

.ov-head {
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

.ov-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ov-mail {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--dim);
  font-size: 0.85rem;
}

.ov-mail > i {
  color: var(--accent);
  opacity: 0.85;
}

.mail-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: #a5f3fc;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  word-break: break-all;
  text-align: left;
  text-decoration: underline dotted rgba(165, 243, 252, 0.4);
  text-underline-offset: 3px;
}

.mail-link:hover {
  color: #67e8f9;
}

.ov-addrs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ov-addrs .lbl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--dim);
  font-size: 0.78rem;
}

.ov-addrs .lbl i {
  color: var(--accent);
  opacity: 0.8;
}

.addr-chip {
  padding: 5px 13px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  background: rgba(7, 11, 20, 0.5);
  color: #b7c5da;
  font-size: 0.78rem;
  word-break: break-all;
}

.no-addr {
  color: var(--dim);
  font-size: 0.8rem;
  font-style: italic;
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

.btn.danger {
  border-color: rgba(251, 113, 133, 0.4);
  background: rgba(251, 113, 133, 0.08);
  color: #fda4af;
}

.btn.danger:hover:not(:disabled) {
  border-color: rgba(251, 113, 133, 0.7);
  background: rgba(251, 113, 133, 0.16);
  color: #fecdd3;
}
</style>
