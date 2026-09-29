<template>
  <el-dialog
    v-model="visible"
    :title="mode === 'add' ? '添加服务器' : '编辑服务器'"
    width="520px"
    append-to-body
    class="server-manage-dialog"
    :close-on-click-modal="false"
  >
    <el-form label-width="90px" @submit.prevent>
      <el-form-item label="服务器 ID" required>
        <el-input
          v-model="serverId"
          placeholder="如 default"
          :disabled="mode === 'edit'"
          maxlength="50"
        />
      </el-form-item>
      <el-form-item label="服务器地址">
        <div class="dialog-addr-list">
          <div v-for="(addr, index) in addresses" :key="index" class="dialog-addr-item">
            <el-input v-model="addresses[index]" placeholder="如 play.example.com:25565" />
            <el-button
              type="danger"
              size="small"
              :disabled="addresses.length <= 1"
              @click="removeAddress(index)"
            >
              <i class="fas fa-minus"></i>
            </el-button>
          </div>
          <el-button
            type="primary"
            size="small"
            :disabled="addresses.length >= MAX_ADDRESSES"
            @click="addAddress"
          >
            <i class="fas fa-plus"></i> 添加地址
          </el-button>
          <p class="dialog-tip">每个服务器最多 {{ MAX_ADDRESSES }} 个地址（支持域名、IPv4、IPv6，可带端口）</p>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ mode === 'add' ? '添加' : '保存' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const MAX_ADDRESSES = 5 // 每台服务器最多地址数（与后端 checkParam 校验一致）

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'add' }, // 'add' | 'edit'
  initialServerId: { type: String, default: '' },
  initialAddresses: { type: Array, default: () => [] },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const serverId = ref('')
const addresses = ref([''])

// 打开弹窗时用外部传入的初始值初始化表单
watch(() => props.modelValue, open => {
  if (!open) return
  serverId.value = props.initialServerId || ''
  addresses.value = props.initialAddresses.length ? [...props.initialAddresses] : ['']
})

function addAddress() {
  if (addresses.value.length < MAX_ADDRESSES) addresses.value.push('')
}

function removeAddress(index) {
  if (addresses.value.length > 1) addresses.value.splice(index, 1)
}

// 仅做提交：校验与接口调用由父组件处理
function handleSubmit() {
  emit('submit', {
    serverId: serverId.value.trim(),
    addresses: addresses.value.map(s => s.trim()).filter(Boolean),
  })
}
</script>

<!-- 弹窗 append-to-body 挂载到 body，需非 scoped 样式 -->
<style>
.server-manage-dialog {
  --el-dialog-bg-color: #0d1526;
  --el-text-color-primary: #e6edf7;
  --el-text-color-regular: #b7c5da;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 16px;
}

.server-manage-dialog .el-dialog__title {
  color: #e6edf7;
  font-weight: 700;
}

.server-manage-dialog .el-form-item__label {
  color: #b7c5da;
}

.server-manage-dialog .el-input__wrapper {
  background: rgba(148, 163, 184, 0.08);
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.25) inset;
}

.server-manage-dialog .el-input__wrapper.is-focus {
  box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.6) inset;
}

.server-manage-dialog .el-input__inner {
  color: #e6edf7;
}

.server-manage-dialog .el-input__inner::placeholder {
  color: #5b6b84;
}

.server-manage-dialog .el-input.is-disabled .el-input__wrapper {
  background: rgba(148, 163, 184, 0.05);
}

.server-manage-dialog .el-input.is-disabled .el-input__inner {
  color: #8b9bb4;
}

.server-manage-dialog .dialog-addr-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.server-manage-dialog .dialog-addr-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.server-manage-dialog .dialog-tip {
  color: #8b9bb4;
  font-size: 0.75rem;
  line-height: 1.5;
}
</style>
