<template>
  <div class="page-container">
    <!-- 欢迎信息 -->
    <el-card shadow="never" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 20px; color: #1a1a1a;">
            {{ greeting }}，{{ authStore.currentUser?.realName }}
          </h2>
          <p style="color: #909399; margin-top: 6px;">
            {{ authStore.currentUser?.areaName }} · {{ getRoleLabel(authStore.userRole) }}
          </p>
        </div>
        <div style="text-align: right; color: #909399;">
          <p style="margin: 0; font-size: 16px;">{{ currentDate }}</p>
        </div>
      </div>
    </el-card>

    <!-- KPI 概览 -->
    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="6">
        <KpiCard icon="OfficeBuilding" :value="data.totalUnits" label="住宿单位总数" color="#409eff" />
      </el-col>
      <el-col :span="6">
        <KpiCard icon="Search" :value="data.spotCheckUnits" label="分配抽查单位数" color="#67c23a" secondary-label="实际抽查数" :secondary-value="data.actualSpotCheckUnits" />
      </el-col>
      <el-col :span="6">
        <KpiCard icon="DocumentChecked" :value="data.importedCheckUnits" label="分配核查单位数" color="#e6a23c" secondary-label="实际核查数" :secondary-value="data.actualImportedCheckUnits" />
      </el-col>
      <el-col :span="6">
        <KpiCard icon="Plus" :value="data.newUnits" label="新增单位数" color="#f56c6c" />
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="12">
        <el-card shadow="never" class="progress-card">
          <template #header>
            <div class="progress-header">
              <span>核查任务执行进度</span>
              <el-button link type="primary" @click="router.push({ path: '/census', query: { taskType: 'sub' } })">查看任务</el-button>
            </div>
          </template>
          <div class="progress-main">
            <strong>{{ importedExecutionProgress }}%</strong>
            <span>分配核查量 {{ allocatedImportedCount }}，任务执行量 {{ importedExecutionCount }}</span>
          </div>
          <el-progress :percentage="importedExecutionProgress" :stroke-width="10" />
        </el-card>
        <el-card shadow="never" class="progress-card secondary-progress">
          <template #header>
            <div class="progress-header">
              <span>抽查任务执行进度</span>
              <el-button link type="primary" @click="router.push({ path: '/census', query: { taskType: 'sub' } })">查看任务</el-button>
            </div>
          </template>
          <div class="progress-main">
            <strong>{{ spotExecutionProgress }}%</strong>
            <span>分配抽查量 {{ allocatedSpotCount }}，任务执行量 {{ spotExecutionCount }}</span>
          </div>
          <el-progress :percentage="spotExecutionProgress" :stroke-width="10" color="#67c23a" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="progress-card">
          <template #header>
            <div class="progress-header">
              <span>审核进度</span>
              <el-button link type="primary" @click="router.push('/accommodation-review')">进入审核</el-button>
            </div>
          </template>
          <div class="review-stages">
            <div v-for="stage in reviewStages" :key="stage.key" class="review-stage">
              <div class="stage-head">
                <span>{{ stage.label }}</span>
                <strong>{{ stage.ratio }}%</strong>
              </div>
              <el-progress :percentage="stage.ratio" :stroke-width="8" :color="stage.color" />
              <p>待审核 {{ stage.pending }}，审核完成 {{ stage.completed }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom: 16px;">
      <el-col :span="24">
        <el-card shadow="never">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>近期普查任务</span>
              <el-button link type="primary" @click="router.push('/census')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentTasks" stripe size="small">
            <el-table-column prop="title" label="任务名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="80" align="center">
              <template #default="{ row }">
                <StatusTag :value="row.status" :options="CENSUS_TASK_STATUS_OPTIONS" />
              </template>
            </el-table-column>
            <el-table-column prop="deadline" label="截止日期" width="100" align="center">
              <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStatisticsStore } from '@/stores/statistics'
import { useCensusStore } from '@/stores/census'
import { storeToRefs } from 'pinia'
import { CENSUS_TASK_STATUS_OPTIONS, getRoleLabel } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'
import { normalizeRecordStatus } from '@/utils/reviewFlow'
import { allocatedImportedCount as assignmentImportedCount, allocatedSpotCount as assignmentSpotCount, isCountyPending } from '@/utils/taskMetrics'
import KpiCard from '@/components/charts/KpiCard.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import db from '@/db'

const router = useRouter()
const authStore = useAuthStore()
const statisticsStore = useStatisticsStore()
const censusStore = useCensusStore()

const { dashboardData: data } = storeToRefs(statisticsStore)
const recentTasks = ref([])
const scopedRecords = ref([])
const scopedAssignments = computed(() => censusStore.assignments)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const currentDate = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
const allocatedImportedCount = computed(() => scopedAssignments.value.reduce((sum, item) => sum + assignmentImportedCount(item), 0))
const allocatedSpotCount = computed(() => scopedAssignments.value.reduce((sum, item) => sum + assignmentSpotCount(item), 0))
const importedExecutionCount = computed(() => scopedRecords.value.filter(item => getRecordCheckType(item) === 'imported_catalog' && isCountyPending(item.status)).length)
const spotExecutionCount = computed(() => scopedRecords.value.filter(item => getRecordCheckType(item) === 'catalog_spot_check' && isCountyPending(item.status)).length)
const importedExecutionProgress = computed(() => allocatedImportedCount.value
  ? Math.min(100, Math.round(importedExecutionCount.value / allocatedImportedCount.value * 100))
  : 0)
const spotExecutionProgress = computed(() => allocatedSpotCount.value
  ? Math.min(100, Math.round(spotExecutionCount.value / allocatedSpotCount.value * 100))
  : 0)
const reviewStages = computed(() => [
  buildReviewStage('county', '县级审核', '#1a5fc5'),
  buildReviewStage('city', '市级审核', '#13c2c2'),
  buildReviewStage('province', '省级审核', '#67c23a'),
])

onMounted(async () => {
  await statisticsStore.fetchDashboardData()
  await censusStore.fetchTasks()
  await censusStore.fetchMyAssignments()
  recentTasks.value = censusStore.tasks.slice(0, 5)
  await loadScopedRecords()
})

async function loadScopedRecords() {
  const assignmentMap = new Map(scopedAssignments.value.map(item => [item.id, item]))
  const assignmentIds = new Set(assignmentMap.keys())
  if (!assignmentIds.size) {
    scopedRecords.value = []
    return
  }
  const allRecords = await db.censusRecords.toArray()
  scopedRecords.value = allRecords
    .filter(item => item.status !== 'draft' && assignmentIds.has(item.assignmentId))
    .map(item => ({ ...item, status: normalizeRecordStatus(item.status), assignment: assignmentMap.get(item.assignmentId) }))
}

function getRecordCheckType(record) {
  if (record.checkType) return record.checkType
  try { return JSON.parse(record.formData || '{}').checkType || '' } catch { return '' }
}

function buildReviewStage(key, label, color) {
  const pendingStatus = {
    county: ['submitted', 'pending_county_review'],
    city: ['pending_city_review'],
    province: ['pending_province_review'],
  }[key]
  const completedStatus = {
    county: ['pending_city_review', 'pending_province_review', 'approved', 'available', 'city_rejected', 'province_rejected'],
    city: ['pending_province_review', 'approved', 'available', 'province_rejected'],
    province: ['approved', 'available'],
  }[key]
  const pending = scopedRecords.value.filter(item => pendingStatus.includes(item.status)).length
  const completed = scopedRecords.value.filter(item => completedStatus.includes(item.status) || item[`${key}ReviewedAt`]).length
  const total = pending + completed
  return { key, label, color, pending, completed, ratio: total ? Math.round(completed / total * 100) : 0 }
}
</script>

<style scoped>
.progress-card {
  border: 1px solid #e8edf5;
}

.secondary-progress {
  margin-top: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
}

.progress-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 12px;
}

.progress-main strong {
  font-size: 30px;
  color: #1a5fc5;
  line-height: 1;
}

.progress-main span {
  color: #606266;
}

.review-stages {
  display: grid;
  gap: 12px;
}

.stage-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-weight: 700;
}

.stage-head strong {
  color: #1a5fc5;
}

.review-stage p {
  margin: 6px 0 0;
  color: #606266;
  font-size: 13px;
}
</style>
