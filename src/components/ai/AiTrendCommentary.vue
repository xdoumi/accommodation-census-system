<template>
  <div v-if="comment" class="ai-commentary">
    <el-icon color="#1a5fc5"><MagicStick /></el-icon>
    <span class="comment-text">{{ comment }}</span>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { insight } from '@/ai'

const props = defineProps({
  chartType: { type: String, default: '' },
  data: { type: Array, default: () => [] },
  title: { type: String, default: '' },
})

const comment = ref('')

watch(() => props.data, async (val) => {
  if (!val || val.length === 0) return
  try {
    comment.value = await insight.commentOnChart(props.chartType, val, props.title)
  } catch {
    comment.value = ''
  }
}, { immediate: true, deep: true })
</script>

<style lang="scss" scoped>
.ai-commentary {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  background: #f0f5fb;
  border-left: 3px solid #1a5fc5;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 13px;

  .comment-text {
    color: #606266;
    line-height: 1.5;
  }
}
</style>