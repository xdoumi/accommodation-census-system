<template>
  <el-card shadow="never">
    <template #header>
      <span style="display: flex; align-items: center; gap: 8px;">
        <el-icon color="#1a5fc5"><Compare /></el-icon>
        <span>AI 区域对比分析</span>
      </span>
    </template>

    <div style="display: flex; gap: 12px; margin-bottom: 16px; align-items: center;">
      <AreaCascader v-model="areaA" :level="3" placeholder="选择区域 A" style="flex: 1;" />
      <span style="color: #909399;">VS</span>
      <AreaCascader v-model="areaB" :level="3" placeholder="选择区域 B" style="flex: 1;" />
      <el-button type="primary" :loading="loading" :disabled="!areaA || !areaB" @click="handleCompare">对比分析</el-button>
    </div>

    <div v-if="loading" style="text-align: center; padding: 30px; color: #909399;">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <p style="margin-top: 8px;">AI 正在分析对比数据...</p>
    </div>

    <div v-if="result" class="result-content" v-html="renderedResult"></div>
  </el-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { insight } from '@/ai'
import AreaCascader from '@/components/common/AreaCascader.vue'

const areaA = ref('')
const areaB = ref('')
const loading = ref(false)
const result = ref('')

const renderedResult = computed(() => {
  if (!result.value) return ''
  let text = result.value
  text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  text = text.replace(/^## (.+)$/gm, '<h3>$1</h3>')
  text = text.replace(/^### (.+)$/gm, '<h4>$1</h4>')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/^- (.+)$/gm, '<li>$1</li>')
  text = text.replace(/(<li>.*<\/li>(\n)?)+/g, m => '<ul>' + m.replace(/\n/g, '') + '</ul>')
  text = text.replace(/\n/g, '<br>')
  return text
})

async function handleCompare() {
  if (!areaA.value || !areaB.value) {
    ElMessage.warning('请选择两个区域')
    return
  }
  loading.value = true
  try {
    result.value = await insight.compareAreas(areaA.value, areaB.value)
  } catch (e) {
    ElMessage.error('对比失败：' + e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.result-content {
  padding: 16px;
  background: #f9fafc;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.8;

  :deep(h3) { font-size: 17px; color: #1a5fc5; margin: 4px 0 8px; }
  :deep(h4) { font-size: 15px; color: #333; margin: 12px 0 4px; }
  :deep(ul) { padding-left: 20px; margin: 6px 0; }
  :deep(strong) { color: #e6a23c; }
}
</style>