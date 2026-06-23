<template>
  <el-popover
    placement="top-start"
    trigger="hover"
    :width="320"
    @before-enter="handleEnter"
  >
    <template #reference>
      <el-icon class="ai-explain-icon"><InfoFilled /></el-icon>
    </template>
    <div class="ai-explain-content">
      <div class="explain-header">
        <el-icon color="#1a5fc5"><MagicStick /></el-icon>
        <span>AI 字段解释</span>
      </div>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="explanation" v-html="renderedExplanation"></div>
    </div>
  </el-popover>
</template>

<script setup>
import { ref, computed } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { dataEntry } from '@/ai'
import { useAiSettingsStore } from '@/stores/aiSettings'

const props = defineProps({
  field: { type: String, required: true },
})

const aiSettings = useAiSettingsStore()
const explanation = ref('')
const loading = ref(false)

const renderedExplanation = computed(() => {
  if (!explanation.value) return ''
  let text = explanation.value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\n/g, '<br>')
  return text
})

async function handleEnter() {
  if (!aiSettings.featureFlags.fieldExplain) return
  if (explanation.value) return // 已加载过

  loading.value = true
  try {
    explanation.value = await dataEntry.explainField(props.field)
  } catch {
    explanation.value = '加载失败'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.ai-explain-icon {
  margin-left: 4px;
  color: #1a5fc5;
  cursor: help;
  font-size: 14px;

  &:hover {
    color: #4a80d4;
  }
}

.ai-explain-content {
  .explain-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #1a5fc5;
    font-size: 13px;
  }

  .explanation {
    font-size: 13px;
    color: #606266;
    line-height: 1.6;
    max-height: 300px;
    overflow-y: auto;
  }

  .loading {
    color: #909399;
    font-size: 13px;
    text-align: center;
    padding: 8px;
  }
}
</style>