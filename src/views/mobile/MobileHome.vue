<template>
  <div style="padding-bottom: 16px;">
    <!-- 顶部欢迎 -->
    <div class="m-card" style="background: linear-gradient(135deg, #1a5fc5, #4a80d4); color: #fff; margin-top: 0; border-radius: 0 0 16px 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 20px; font-weight: 600;">{{ greeting }}，{{ authStore.currentUser?.realName }}</h2>
          <p style="margin: 6px 0 0; opacity: 0.85; font-size: 14px;">{{ authStore.currentUser?.areaName }} · {{ ROLE_MAP[authStore.userRole] }}</p>
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

    <!-- 入口 -->
    <div class="m-card">
      <div class="m-grid-entry" style="padding: 0;">
        <div class="m-grid-item" @click="router.push('/m/tasks')">
          <div class="m-grid-icon" style="background: #e8f0fa; color: #1a5fc5;"><el-icon :size="22"><Edit /></el-icon></div>
          <span class="m-grid-text">开始填报</span>
        </div>
        <div class="m-grid-item" @click="router.push('/m/units')">
          <div class="m-grid-icon" style="background: #e8f8ef; color: #67c23a;"><el-icon :size="22"><OfficeBuilding /></el-icon></div>
          <span class="m-grid-text">填写清单</span>
        </div>
        <div class="m-grid-item" @click="router.push('/m/tasks')">
          <div class="m-grid-icon" style="background: #fdf6ec; color: #e6a23c;"><el-icon :size="22"><Bell /></el-icon></div>
          <span class="m-grid-text">任务提醒</span>
        </div>
      </div>
    </div>

    <!-- 最近任务 -->
    <div class="m-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 15px; font-weight: 600;">最近任务</span>
        <el-button link type="primary" size="small" @click="router.push('/m/tasks')">查看全部</el-button>
      </div>
      <div v-if="recentTasks.length === 0" style="text-align: center; color: #909399; padding: 20px;">
        暂无任务
      </div>
      <div v-for="task in recentTasks" :key="task.id" class="task-card" @click="router.push(`/m/tasks/${task.id}`)">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 15px; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ task.title }}</span>
          <StatusTag :value="task.status" :options="CENSUS_TASK_STATUS_OPTIONS" />
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 13px; color: #909399;">
          <span>截止：{{ formatDate(task.deadline) }}</span>
          <span>{{ JSON.parse(task.assignedAreaCodes || '[]').length }}个区域</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCensusStore } from '@/stores/census'
import { useStatisticsStore } from '@/stores/statistics'
import { ROLE_MAP, CENSUS_TASK_STATUS_OPTIONS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'
import { storeToRefs } from 'pinia'
import StatusTag from '@/components/common/StatusTag.vue'

const router = useRouter()
const authStore = useAuthStore()
const censusStore = useCensusStore()
const statisticsStore = useStatisticsStore()

const { dashboardData: data } = storeToRefs(statisticsStore)
const recentTasks = ref([])

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const todoCount = computed(() => censusStore.assignments.filter(a => a.status === 'pending').length)
const inProgressCount = computed(() => censusStore.assignments.filter(a => ['in_progress', 'submitted'].includes(a.status)).length)
const completedCount = computed(() => censusStore.assignments.filter(a => a.status === 'reviewed').length)

onMounted(async () => {
  await censusStore.fetchMyAssignments()
  await censusStore.fetchTasks()
  recentTasks.value = censusStore.tasks.slice(0, 3)
  await statisticsStore.fetchDashboardData()
})
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

.task-card {
  padding: 12px;
  border-radius: 10px;
  background: #f9fafc;
  margin-bottom: 8px;

  &:last-child { margin-bottom: 0; }
  &:active { background: #f0f2f5; }
}
</style>
