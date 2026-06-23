<template>
  <div class="ai-nl-query">
    <el-card shadow="never" class="nl-query-card">
      <div style="display: flex; align-items: center; gap: 8px;">
        <el-icon :size="18" color="#1a5fc5"><MagicStick /></el-icon>
        <span style="font-weight: 600; color: #1a5fc5; white-space: nowrap;">AI 智能查询</span>
        <el-input
          v-model="query"
          placeholder="用自然语言提问，如：贵阳市五星级酒店平均房价"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
      </div>

      <div v-if="error" class="error-msg">
        <el-alert :title="error" type="error" :closable="true" @close="error = ''" show-icon />
      </div>

      <!-- 结果 -->
      <div v-if="result" class="result-panel">
        <div class="result-narrative" v-html="renderedNarrative"></div>

        <div v-if="result.chartType !== 'none' && result.chartData?.length > 0" style="margin-top: 12px;">
          <EchartsRenderer :chart-type="result.chartType" :data="result.chartData" />
        </div>

        <el-table v-if="result.tableColumns?.length > 0" :data="result.tableRows || []" stripe border size="small" style="margin-top: 12px;">
          <el-table-column v-for="col in result.tableColumns" :key="col.prop" :prop="col.prop" :label="col.label" min-width="100" />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { insight } from '@/ai'
import EchartsRenderer from './EchartsRenderer.vue'

const query = ref('')
const loading = ref(false)
const result = ref(null)
const error = ref('')

const renderedNarrative = computed(() => {
  if (!result.value?.narrative) return ''
  let text = result.value.narrative.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\n/g, '<br>')
  return text
})

async function handleSearch() {
  if (!query.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    const res = await insight.naturalLanguageQuery(query.value.trim())
    result.value = res
  } catch (e) {
    error.value = '查询失败：' + e.message
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.nl-query-card {
  margin-bottom: 12px;
}

.error-msg {
  margin-top: 12px;
}

.result-panel {
  margin-top: 16px;
  padding: 16px;
  background: #f9fafc;
  border-radius: 8px;

  .result-narrative {
    font-size: 14px;
    line-height: 1.8;
    color: #333;

    :deep(strong) { color: #1a5fc5; }
  }
}
</style>
