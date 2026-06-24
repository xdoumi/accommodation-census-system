<template>
  <div style="padding-bottom: 16px;">
    <!-- 顶部欢迎 -->
    <div class="m-card" style="background: linear-gradient(135deg, #1a5fc5, #4a80d4); color: #fff; margin-top: 0; border-radius: 0 0 16px 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 20px; font-weight: 600;">{{ greeting }}，{{ authStore.currentUser?.realName }}</h2>
          <p style="margin: 6px 0 0; opacity: 0.85; font-size: 14px;">{{ authStore.currentUser?.areaName }} · {{ getRoleLabel(authStore.userRole) }}</p>
        </div>
        <el-avatar :size="48" :icon="UserFilled" style="background: rgba(255,255,255,0.2);" />
      </div>
    </div>

    <!-- 待办统计 -->
    <div class="m-card" style="margin-top: -24px; position: relative; z-index: 1;">
      <el-row :gutter="12">
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-value" style="color: #1a5fc5;">{{ todoCount }}</div>
            <div class="stat-label">待填报</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-value" style="color: #e6a23c;">{{ inProgressCount }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-value" style="color: #67c23a;">{{ completedCount }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="m-card progress-card">
      <div class="progress-row">
        <div>
          <div class="progress-title">任务执行进度</div>
          <div class="progress-sub">{{ completedAssignments }}/{{ totalAssignments }} 个分配区域完成</div>
        </div>
        <strong>{{ executionProgress }}%</strong>
      </div>
      <el-progress :percentage="executionProgress" :stroke-width="8" :show-text="false" />
      <div class="progress-row review">
        <div>
          <div class="progress-title">审核进度</div>
          <div class="progress-sub">{{ reviewedRecords }}/{{ totalRecords }} 条记录通过审核</div>
        </div>
        <strong>{{ reviewProgress }}%</strong>
      </div>
      <el-progress :percentage="reviewProgress" :stroke-width="8" :show-text="false" color="#67c23a" />
    </div>

    <!-- 入口 -->
    <div class="m-card">
      <div class="m-grid-entry" style="padding: 0;">
        <div class="m-grid-item" @click="router.push('/m/tasks')">
          <div class="m-grid-icon" style="background: #e8f0fa; color: #1a5fc5;"><el-icon :size="22"><Edit /></el-icon></div>
          <span class="m-grid-text">开始填报</span>
        </div>
        <div class="m-grid-item" @click="router.push('/m/units')">
          <div class="m-grid-icon" style="background: #eefaf1; color: #2f8f4e;"><el-icon :size="22"><OfficeBuilding /></el-icon></div>
          <span class="m-grid-text">填写清单</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCensusStore } from '@/stores/census'
import { useStatisticsStore } from '@/stores/statistics'
import { getRoleLabel } from '@/utils/constants'
import { storeToRefs } from 'pinia'
import db from '@/db'

const router = useRouter()
const authStore = useAuthStore()
const censusStore = useCensusStore()
const statisticsStore = useStatisticsStore()
const records = ref([])

const { dashboardData: data } = storeToRefs(statisticsStore)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const todoCount = computed(() => censusStore.assignments.filter(a => a.status === 'pending').length)
const inProgressCount = computed(() => censusStore.assignments.filter(a => ['in_progress', 'submitted'].includes(a.status)).length)
const completedCount = computed(() => censusStore.assignments.filter(a => a.status === 'reviewed').length)
const totalAssignments = computed(() => censusStore.assignments.length)
const completedAssignments = computed(() => censusStore.assignments.filter(a => ['submitted', 'reviewed', 'completed'].includes(a.status) || Number(a.progress) >= 100).length)
const executionProgress = computed(() => totalAssignments.value ? Math.round(censusStore.assignments.reduce((sum, item) => sum + Number(item.progress || 0), 0) / totalAssignments.value) : 0)
const totalRecords = computed(() => records.value.length)
const reviewedRecords = computed(() => records.value.filter(record => ['available', 'approved'].includes(record.status)).length)
const reviewProgress = computed(() => totalRecords.value ? Math.round(reviewedRecords.value / totalRecords.value * 100) : 0)

onMounted(async () => {
  await censusStore.fetchMyAssignments()
  await statisticsStore.fetchDashboardData()
  await loadRecords()
})

async function loadRecords() {
  const assignmentIds = censusStore.assignments.map(item => item.id)
  const list = []
  for (const assignmentId of assignmentIds) {
    list.push(...await db.censusRecords.where('assignmentId').equals(assignmentId).toArray())
  }
  records.value = list
}
</script>

<style lang="scss" scoped>
.stat-item {
  text-align: center;

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}

.progress-card {
  .progress-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    margin-bottom: 8px;

    &.review {
      margin-top: 16px;
    }

    strong {
      color: #1a5fc5;
      font-size: 18px;
    }
  }

  .progress-title {
    font-size: 15px;
    font-weight: 700;
    color: #1f2937;
  }

  .progress-sub {
    margin-top: 3px;
    font-size: 12px;
    color: #909399;
  }
}
</style>
