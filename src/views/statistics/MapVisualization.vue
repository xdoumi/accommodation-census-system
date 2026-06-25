<template>
  <div class="page-container">
    <el-card shadow="never">
      <div class="page-header">
        <span class="page-title">住宿单位地图分布</span>
        <div style="display: flex; gap: 12px; align-items: center;">
          <el-radio-group v-model="metric" size="small" @change="recompute">
            <el-radio-button label="count">单位数量</el-radio-button>
            <el-radio-button label="rooms">客房总数</el-radio-button>
          </el-radio-group>
          <el-select v-model="selectedRating" placeholder="全部等级" clearable style="width: 160px;" @change="recompute">
            <el-option v-for="opt in ratingOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
      </div>
      <GeoMapChart :data="mapData" :title="''" show-visual-map @region-click="onRegionClick" />
      <div style="text-align: center; margin-top: 8px; color: #909399; font-size: 12px;">
        💡 提示：点击地图上的州市可在下方表格中查看该区域明细
      </div>
    </el-card>

    <el-card shadow="never" style="margin-top: 16px;">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>区域统计{{ activeRegion ? ` - ${activeRegion}` : '' }}</span>
          <el-button v-if="activeRegion" link type="primary" size="small" @click="activeRegion = ''">
            返回全省
          </el-button>
        </div>
      </template>
      <el-table :data="visibleRegionStats" stripe border size="small">
        <el-table-column prop="name" label="区域" min-width="120" />
        <el-table-column prop="count" label="单位数量" width="100" align="center" sortable />
        <el-table-column prop="rooms" label="客房总数" width="100" align="center" sortable />
        <el-table-column prop="operatingCount" label="正常营业" width="100" align="center" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStatisticsStore } from '@/stores/statistics'
import { useAreaStore } from '@/stores/area'
import { useAuthStore } from '@/stores/auth'
import db from '@/db'
import { filterByScope } from '@/utils/dataScope'
import { COLLECTION_FIELD_MAP } from '@/utils/collectionSpec'
import GeoMapChart from '@/components/charts/GeoMapChart.vue'

const statisticsStore = useStatisticsStore()
const areaStore = useAreaStore()
const authStore = useAuthStore()

const selectedRating = ref('')
const metric = ref('count')
const activeRegion = ref('')          // 当前钻取的市名（中文）
const allAccommodations = ref([])     // 已经做过权限过滤
const regionStats = ref([])           // 市级聚合
const countyStatsByCity = ref({})     // 钻取用：cityName -> 区县统计列表
const mapData = ref([])
const ratingOptions = COLLECTION_FIELD_MAP.ratingLevel.options

async function loadData() {
  await areaStore.fetchAreas()
  const raw = (await db.accommodations.toArray()).filter(item => !item.deletedAt)
  allAccommodations.value = filterByScope(raw, authStore.userRole, authStore.userAreaCode)
  recompute()
}

function buildStats(list, groupBy /* 'city' | 'county' */) {
  const map = {}
  for (const a of list) {
    const code = groupBy === 'city' ? a.cityCode : a.countyCode
    if (!code) continue
    if (!map[code]) {
      map[code] = {
        code,
        name: areaStore.getAreaName(code),
        count: 0, rooms: 0, operatingCount: 0,
      }
    }
    const m = map[code]
    m.count++
    m.rooms += a.rooms || 0
    if (a.operatingStatus === 'operating') {
      m.operatingCount++
    }
  }
  return Object.values(map)
}

function recompute() {
  let list = allAccommodations.value
  if (selectedRating.value) {
    list = list.filter(a => a.ratingLevel === selectedRating.value)
  }

  // 市级聚合
  regionStats.value = buildStats(list, 'city').sort((a, b) => b.count - a.count)

  // 各市的区县缓存
  const byCity = {}
  for (const city of regionStats.value) {
    const subList = list.filter(a => a.cityCode === city.code)
    byCity[city.name] = buildStats(subList, 'county').sort((a, b) => b.count - a.count)
  }
  countyStatsByCity.value = byCity

  // 地图数据：用市级中心点，metric 决定 value[2]
  mapData.value = regionStats.value
    .map(r => {
      const sample = list.find(a => a.cityCode === r.code && a.longitude && a.latitude)
      if (!sample) return null
      const val = r[metric.value] ?? 0
      return { name: r.name, value: [sample.longitude, sample.latitude, val], category: sample.ratingLevel }
    })
    .filter(Boolean)
}

function onRegionClick({ name }) {
  // 点击地图地名 → 在下方表格切换到该市的区县明细
  if (countyStatsByCity.value[name] && countyStatsByCity.value[name].length) {
    activeRegion.value = name
  }
}

const visibleRegionStats = computed(() => {
  if (activeRegion.value && countyStatsByCity.value[activeRegion.value]) {
    return countyStatsByCity.value[activeRegion.value]
  }
  return regionStats.value
})

onMounted(() => {
  loadData()
  // 触发一次 store 加载，AI 模块复用
  statisticsStore.fetchDashboardData()
})
</script>
