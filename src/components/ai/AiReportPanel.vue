<template>
  <el-card shadow="never">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <el-icon color="#1a5fc5"><Document /></el-icon>
          <span>AI 数据分析报告</span>
        </span>
        <div>
          <el-button type="primary" :icon="MagicStick" :loading="loading" @click="handleGenerate">
            {{ report ? '重新生成' : '生成 AI 报告' }}
          </el-button>
          <el-button v-if="report" :icon="Download" @click="handleExport">导出</el-button>
        </div>
      </div>
    </template>

    <div v-if="!report && !loading" class="empty-state">
      <el-icon :size="48" color="#dcdfe6"><Document /></el-icon>
      <p>点击"生成 AI 报告"，AI 将基于当前数据生成一份完整的分析报告</p>
    </div>

    <div v-if="loading" style="padding: 40px; text-align: center; color: #909399;">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <p style="margin-top: 12px;">AI 正在分析数据并撰写报告...</p>
    </div>

    <div v-if="report" class="report-content" v-html="renderedReport"></div>
  </el-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Document, MagicStick, Download } from '@element-plus/icons-vue'
import { insight } from '@/ai'

const loading = ref(false)
const report = ref('')

const renderedReport = computed(() => {
  if (!report.value) return ''
  let text = report.value
  // HTML 转义
  text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // 标题
  text = text.replace(/^# (.+)$/gm, '<h2>$1</h2>')
  text = text.replace(/^## (.+)$/gm, '<h3>$1</h3>')
  text = text.replace(/^### (.+)$/gm, '<h4>$1</h4>')
  // 粗体
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 斜体
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // 列表
  text = text.replace(/^- (.+)$/gm, '<li>$1</li>')
  text = text.replace(/(<li>.*<\/li>(\n)?)+/g, m => '<ul>' + m.replace(/\n/g, '') + '</ul>')
  // 段落
  text = text.replace(/\n\n/g, '</p><p>')
  text = '<p>' + text + '</p>'
  text = text.replace(/<p>(<h\d>.*?<\/h\d>)<\/p>/g, '$1')
  text = text.replace(/<p>(<ul>.*?<\/ul>)<\/p>/g, '$1')
  return text
})

async function handleGenerate() {
  loading.value = true
  try {
    const result = await insight.generateReport()
    report.value = result.content || result
  } catch (e) {
    ElMessage.error('生成失败：' + e.message)
  } finally {
    loading.value = false
  }
}

function handleExport() {
  const blob = new Blob([report.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `AI分析报告_${new Date().toISOString().split('T')[0]}.md`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已下载')
}
</script>

<style lang="scss" scoped>
.empty-state {
  text-align: center;
  padding: 40px;
  color: #909399;

  p { margin-top: 12px; }
}

.report-content {
  padding: 16px;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  max-height: 600px;
  overflow-y: auto;

  :deep(h2) { font-size: 20px; margin: 16px 0 8px; color: #1a5fc5; border-bottom: 2px solid #e8f0fa; padding-bottom: 4px; }
  :deep(h3) { font-size: 16px; margin: 14px 0 6px; color: #333; }
  :deep(h4) { font-size: 14px; margin: 10px 0 4px; color: #606266; }
  :deep(p) { margin: 8px 0; }
  :deep(ul) { padding-left: 24px; margin: 8px 0; }
  :deep(li) { margin: 4px 0; }
  :deep(strong) { color: #e6a23c; font-weight: 600; }
}
</style>