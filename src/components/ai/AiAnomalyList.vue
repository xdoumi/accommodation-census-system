<template>
  <el-card shadow="never">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <el-icon color="#f56c6c"><WarningFilled /></el-icon>
          <span>AI 异常数据预警</span>
          <el-tag v-if="anomalies.length > 0" type="danger" size="small">{{ anomalies.length }}</el-tag>
        </span>
        <el-button link type="primary" size="small" :icon="Refresh" @click="loadAnomalies">刷新</el-button>
      </div>
    </template>

    <div v-if="loading" style="text-align: center; padding: 20px;">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span style="margin-left: 8px; color: #909399;">AI 正在扫描数据...</span>
    </div>

    <div v-else-if="anomalies.length === 0" style="text-align: center; padding: 20px; color: #67c23a;">
      <el-icon :size="24"><CircleCheck /></el-icon>
      <p style="margin-top: 8px;">未发现明显异常数据</p>
    </div>

    <el-table v-else :data="anomalies" stripe size="small" max-height="400">
      <el-table-column prop="name" label="单位名称" min-width="140" show-overflow-tooltip />
      <el-table-column prop="type" label="类型" width="60" align="center">
        <template #default="{ row }">
          <el-tag :type="row.severity === 'error' ? 'danger' : 'warning'" size="small">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="问题描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="操作" width="80" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="router.push(`/accommodation/${row.id}`)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading, WarningFilled, CircleCheck, Refresh } from '@element-plus/icons-vue'
import { insight } from '@/ai'

const router = useRouter()
const anomalies = ref([])
const loading = ref(false)

onMounted(() => loadAnomalies())

async function loadAnomalies() {
  loading.value = true
  try {
    const result = await insight.detectAnomaliesGlobal()
    anomalies.value = result.anomalies || []
  } catch {
    anomalies.value = []
  } finally {
    loading.value = false
  }
}
</script>