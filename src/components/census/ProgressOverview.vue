<template>
  <div class="progress-overview">
    <el-row :gutter="16">
      <el-col :span="6" v-for="stat in stats" :key="stat.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </el-card>
      </el-col>
    </el-row>
    <div style="margin-top: 16px;">
      <el-table :data="assignments" stripe border size="small">
        <el-table-column prop="areaName" label="区域" min-width="120" />
        <el-table-column prop="assignedToName" label="负责人" width="100" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <StatusTag :value="row.status" :options="CENSUS_ASSIGNMENT_STATUS_OPTIONS" />
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="180">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" :status="row.progress === 100 ? 'success' : ''" :stroke-width="14" />
          </template>
        </el-table-column>
        <el-table-column prop="submittedAt" label="提交时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CENSUS_ASSIGNMENT_STATUS_OPTIONS } from '@/utils/constants'
import { formatDateTime } from '@/utils/formatters'
import StatusTag from '@/components/common/StatusTag.vue'

const props = defineProps({
  assignments: { type: Array, default: () => [] },
})

const stats = computed(() => {
  const list = props.assignments
  return [
    { label: '总分配区域', value: list.length, color: '#409eff' },
    { label: '待填报', value: list.filter(a => a.status === 'pending').length, color: '#909399' },
    { label: '填报中/已提交', value: list.filter(a => ['in_progress', 'submitted'].includes(a.status)).length, color: '#e6a23c' },
    { label: '已审核', value: list.filter(a => a.status === 'reviewed').length, color: '#67c23a' },
  ]
})
</script>

<style lang="scss" scoped>
.stat-card {
  text-align: center;

  .stat-value {
    font-size: 28px;
    font-weight: 700;
  }

  .stat-label {
    font-size: 13px;
    color: #909399;
    margin-top: 4px;
  }
}
</style>
