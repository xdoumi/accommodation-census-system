<template>
  <el-alert
    v-if="issues.length > 0"
    :type="hasError ? 'error' : 'warning'"
    :closable="false"
    show-icon
    style="margin-bottom: 12px;"
  >
    <template #title>
      <span>
        <el-icon><WarningFilled /></el-icon>
        AI 检测到 {{ issues.length }} 个数据异常
      </span>
    </template>
    <div class="anomaly-issues">
      <div v-for="(issue, idx) in issues" :key="idx" class="anomaly-issue">
        <div>
          <strong>[{{ issue.severity === 'error' ? '错误' : '提示' }}]</strong>
          {{ issue.message }}
        </div>
        <div v-if="issue.suggestion" class="suggestion">
          💡 {{ issue.suggestion }}
        </div>
        <el-button
          v-if="issue.suggestedValue !== undefined && issue.field"
          link
          type="primary"
          size="small"
          @click="handleFix(issue)"
        >
          一键修正
        </el-button>
      </div>
    </div>
  </el-alert>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import { dataEntry } from '@/ai'
import { useAiSettingsStore } from '@/stores/aiSettings'

const props = defineProps({
  formData: { type: Object, required: true },
})

const emit = defineEmits(['fix', 'update:formData'])

const aiSettings = useAiSettingsStore()
const issues = ref([])
let timer = null

const hasError = computed(() => issues.value.some(i => i.severity === 'error'))

async function checkAnomalies() {
  if (!aiSettings.featureFlags.anomaly) return

  try {
    issues.value = await dataEntry.detectAnomalies(props.formData)
  } catch { /* 静默失败 */ }
}

// 防抖检测
watch(() => props.formData, () => {
  clearTimeout(timer)
  timer = setTimeout(checkAnomalies, 800)
}, { deep: true })

function handleFix(issue) {
  emit('fix', { field: issue.field, value: issue.suggestedValue })
}
</script>

<style lang="scss" scoped>
.anomaly-issues {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.anomaly-issue {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  font-size: 13px;

  .suggestion {
    color: #606266;
    font-size: 12px;
    margin-top: 4px;
  }
}
</style>