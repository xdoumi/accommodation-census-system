<template>
  <div class="page-container">
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

    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="12">
        <el-card shadow="never">
          <CategoryBarChart :data="data.ratingBreakdown" title="等级分布" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <RegionPieChart :data="data.sourceBreakdown" title="来源分布" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="12">
        <el-card shadow="never">
          <RegionPieChart :data="data.checkTypeBreakdown" title="核查类型分布" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <CategoryBarChart :data="data.industryBreakdown" title="住宿行业分布" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <RegionPieChart :data="data.operatingStatusBreakdown" title="经营状态分布" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStatisticsStore } from '@/stores/statistics'
import { storeToRefs } from 'pinia'
import KpiCard from '@/components/charts/KpiCard.vue'
import CategoryBarChart from '@/components/charts/CategoryBarChart.vue'
import RegionPieChart from '@/components/charts/RegionPieChart.vue'

const statisticsStore = useStatisticsStore()
const { dashboardData: data } = storeToRefs(statisticsStore)

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
