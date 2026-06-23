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
            {{ authStore.currentUser?.areaName }} · {{ ROLE_MAP[authStore.userRole] }}
          </p>
        </div>
        <div style="text-align: right; color: #909399;">
          <p style="margin: 0; font-size: 16px;">{{ currentDate }}</p>
        </div>
      </div>
    </el-card>

    <!-- AI 自然语言查询 -->
    <AiNlQueryBox v-if="aiSettings.featureFlags.nlQuery" />

    <!-- KPI 概览 -->
    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="6">
        <KpiCard icon="OfficeBuilding" :value="data.totalUnits" label="住宿单位总数" color="#409eff" />
      </el-col>
      <el-col :span="6">
        <KpiCard icon="House" :value="data.totalRooms" label="客房总数" color="#67c23a" />
      </el-col>
      <el-col :span="6">
        <KpiCard icon="Bed" :value="data.totalBeds" label="床位总数" color="#909399" />
      </el-col>
      <el-col :span="6">
        <KpiCard icon="UserFilled" :value="data.totalStaff" label="从业总人数" color="#f56c6c" />
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom: 16px;">
      <!-- 类别分布 + AI 解读 -->
      <el-col :span="12">
        <el-card shadow="never">
          <CategoryBarChart :data="data.categoryBreakdown" title="住宿单位类别分布" />
          <AiTrendCommentary chart-type="bar" :data="data.categoryBreakdown" title="住宿单位类别分布" />
        </el-card>
      </el-col>

      <!-- 普查任务概览 -->
      <el-col :span="12">
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

    <!-- AI 异常数据预警 -->
    <AiAnomalyList />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStatisticsStore } from '@/stores/statistics'
import { useCensusStore } from '@/stores/census'
import { useAiSettingsStore } from '@/stores/aiSettings'
import { storeToRefs } from 'pinia'
import { ROLE_MAP, CENSUS_TASK_STATUS_OPTIONS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'
import KpiCard from '@/components/charts/KpiCard.vue'
import CategoryBarChart from '@/components/charts/CategoryBarChart.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import AiNlQueryBox from '@/components/ai/AiNlQueryBox.vue'
import AiTrendCommentary from '@/components/ai/AiTrendCommentary.vue'
import AiAnomalyList from '@/components/ai/AiAnomalyList.vue'

const router = useRouter()
const authStore = useAuthStore()
const statisticsStore = useStatisticsStore()
const censusStore = useCensusStore()
const aiSettings = useAiSettingsStore()

const { dashboardData: data } = storeToRefs(statisticsStore)
const recentTasks = ref([])

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

onMounted(async () => {
  await statisticsStore.fetchDashboardData()
  await censusStore.fetchTasks()
  recentTasks.value = censusStore.tasks.slice(0, 5)
})
</script>
