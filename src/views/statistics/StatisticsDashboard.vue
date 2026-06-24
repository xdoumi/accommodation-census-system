<template>
  <div class="page-container">
    <el-tabs v-model="activeTab" class="stat-tabs">
      <!-- Tab 1: 概览 -->
      <el-tab-pane label="数据概览" name="overview">
        <!-- KPI 卡片 -->
        <el-row :gutter="16" style="margin-bottom: 20px;">
          <el-col :span="6">
            <KpiCard icon="OfficeBuilding" :value="data.totalUnits" label="住宿单位总数" color="#409eff" />
          </el-col>
          <el-col :span="6">
            <KpiCard icon="House" :value="data.totalRooms" label="客房总数" color="#67c23a" formatter="number" />
          </el-col>
          <el-col :span="6">
            <KpiCard icon="Bed" :value="data.totalBeds" label="床位总数" color="#909399" />
          </el-col>
          <el-col :span="6">
            <KpiCard icon="UserFilled" :value="data.totalStaff" label="从业总人数" color="#f56c6c" />
          </el-col>
        </el-row>

        <el-row :gutter="16" style="margin-bottom: 20px;">
          <el-col :span="6">
            <KpiCard icon="CircleCheck" :value="operatingRate" label="正常营业率" color="#13c2c2" formatter="percent" />
          </el-col>
        </el-row>

        <!-- 图表（含 AI 解读） -->
        <el-row :gutter="16" style="margin-bottom: 20px;">
          <el-col :span="12">
            <el-card shadow="never">
              <CategoryBarChart :data="data.categoryBreakdown" title="类别分布" />
              <AiTrendCommentary chart-type="bar" :data="data.categoryBreakdown" title="类别分布" />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <RegionPieChart :data="data.regionBreakdown" title="区域分布" />
              <AiTrendCommentary chart-type="pie" :data="data.regionBreakdown" title="区域分布" />
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16" style="margin-bottom: 20px;">
          <el-col :span="12">
            <el-card shadow="never">
              <RegionPieChart :data="data.operatingStatusBreakdown" title="经营状态分布" />
              <AiTrendCommentary chart-type="pie" :data="data.operatingStatusBreakdown" title="经营状态分布" />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <RegionPieChart :data="data.licenseStatusBreakdown" title="证照状态分布" />
              <AiTrendCommentary chart-type="pie" :data="data.licenseStatusBreakdown" title="证照状态分布" />
            </el-card>
          </el-col>
        </el-row>

        <!-- 开业年份趋势 -->
        <el-card shadow="never" style="margin-bottom: 20px;">
          <OpenYearTrendChart :accommodations="data.rawAccommodations" title="近年新增开业趋势" />
        </el-card>

        <!-- 地图 -->
        <el-card shadow="never">
          <GeoMapChart :data="data.mapPointsAggregated || data.mapPoints" title="住宿单位地理分布" />
        </el-card>
      </el-tab-pane>

      <!-- Tab 2: 排行榜 -->
      <el-tab-pane name="ranking">
        <template #label>
          <span><el-icon><Trophy /></el-icon> 排行榜</span>
        </template>
        <el-alert
          title="排行榜基于当前权限范围内的住宿单位计算。"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 16px;"
        />
        <el-row :gutter="16">
          <el-col :span="12" style="margin-bottom: 16px;">
            <TopRankingList title="客房规模 Top 5" :items="data.topByRooms" unit="间" />
          </el-col>
          <el-col :span="12" style="margin-bottom: 16px;">
            <TopRankingList title="年营业收入 Top 5" :items="data.topByRevenue" format="currency" unit="元" />
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- Tab 3: AI 洞察 -->
      <el-tab-pane name="insights">
        <template #label>
          <span><el-icon><MagicStick /></el-icon> AI 洞察</span>
        </template>
        <AiNlQueryBox style="margin-bottom: 16px;" />
        <AiReportPanel style="margin-bottom: 16px;" />
        <AiComparePanel />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStatisticsStore } from '@/stores/statistics'
import { storeToRefs } from 'pinia'
import KpiCard from '@/components/charts/KpiCard.vue'
import CategoryBarChart from '@/components/charts/CategoryBarChart.vue'
import RegionPieChart from '@/components/charts/RegionPieChart.vue'
import GeoMapChart from '@/components/charts/GeoMapChart.vue'
import OpenYearTrendChart from '@/components/charts/OpenYearTrendChart.vue'
import TopRankingList from '@/components/charts/TopRankingList.vue'
import AiTrendCommentary from '@/components/ai/AiTrendCommentary.vue'
import AiNlQueryBox from '@/components/ai/AiNlQueryBox.vue'
import AiReportPanel from '@/components/ai/AiReportPanel.vue'
import AiComparePanel from '@/components/ai/AiComparePanel.vue'

const statisticsStore = useStatisticsStore()
const { dashboardData: data } = storeToRefs(statisticsStore)
const activeTab = ref('overview')

const operatingRate = computed(() => {
  const total = data.value.totalUnits
  if (!total) return 0
  const operating = (data.value.rawAccommodations || []).filter(a => a.operatingStatus === 'operating').length
  return Math.round(operating / total * 1000) / 10
})

onMounted(() => {
  statisticsStore.fetchDashboardData()
})
</script>

<style lang="scss" scoped>
.stat-tabs {
  :deep(.el-tabs__item) {
    font-size: 15px;
  }
}
</style>
