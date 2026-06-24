import { defineStore } from 'pinia'
import { ref } from 'vue'
import db from '@/db'
import { useAuthStore } from './auth'
import { CATEGORY_MAP } from '@/utils/constants'
import { filterByScope } from '@/utils/dataScope'

export const useStatisticsStore = defineStore('statistics', () => {
  const dashboardData = ref({
    totalUnits: 0,
    spotCheckUnits: 0,
    importedCheckUnits: 0,
    newUnits: 0,
    categoryBreakdown: [],
    regionBreakdown: [],
    totalRooms: 0,
    totalBeds: 0,
    totalStaff: 0,
    operatingStatusBreakdown: [],
    licenseStatusBreakdown: [],
    mapPoints: [],
    mapPointsAggregated: [],
    rawAccommodations: [],     // 原始数据（已经做过权限过滤），用于上层趋势/排行
    topByRooms: [],            // 客房数 Top 5
    topByRevenue: [],          // 年营收 Top 5
  })
  const loading = ref(false)

  async function fetchDashboardData() {
    loading.value = true
    try {
      const auth = useAuthStore()
      const allRaw = await db.accommodations.toArray()
      const allUnitsFull = allRaw.filter(item => !item.deletedAt)
      // 区域范围过滤（统一走 dataScope）
      const allAccommodations = filterByScope(allUnitsFull, auth.userRole, auth.userAreaCode)

      // 类别分布
      const categoryMap = {}
      for (const cat of Object.keys(CATEGORY_MAP)) {
        categoryMap[cat] = 0
      }
      allAccommodations.forEach(a => { categoryMap[a.category] = (categoryMap[a.category] || 0) + 1 })
      const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({ name: CATEGORY_MAP[name], value }))

      // 区域分布
      const regionMap = {}
      allAccommodations.forEach(a => {
        // 用市代码聚合
        const cityCode = a.cityCode
        if (!regionMap[cityCode]) regionMap[cityCode] = { code: cityCode, count: 0 }
        regionMap[cityCode].count++
      })

      // 获取区域名称
      const areas = await db.areas.toArray()
      const areaNameMap = Object.fromEntries(areas.map(a => [a.code, a.name]))
      const regionBreakdown = Object.values(regionMap).map(r => ({
        name: areaNameMap[r.code] || r.code,
        value: r.count,
      }))

      // 经营状态分布
      const statusMap = {}
      allAccommodations.forEach(a => { statusMap[a.operatingStatus] = (statusMap[a.operatingStatus] || 0) + 1 })
      const statusLabels = { operating: '正常营业', closed: '停业', renovating: '装修中', suspended: '暂停营业' }
      const operatingStatusBreakdown = Object.entries(statusMap).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }))

      // 证照状态分布
      const licenseMap = {}
      allAccommodations.forEach(a => { licenseMap[a.licenseStatus] = (licenseMap[a.licenseStatus] || 0) + 1 })
      const licenseLabels = { licensed: '已办证', pending: '办理中', none: '未办证' }
      const licenseStatusBreakdown = Object.entries(licenseMap).map(([k, v]) => ({ name: licenseLabels[k] || k, value: v }))

      // 地图点位数据
      const mapPoints = allAccommodations
        .filter(a => a.longitude && a.latitude)
        .map(a => ({ name: a.name, value: [a.longitude, a.latitude, 1], category: a.category }))

      // 聚合地图数据到区县级别
      const countyPointMap = {}
      allAccommodations.filter(a => a.longitude && a.latitude).forEach(a => {
        if (!countyPointMap[a.countyCode]) {
          countyPointMap[a.countyCode] = { name: areaNameMap[a.countyCode] || a.countyCode, value: [a.longitude, a.latitude, 0] }
        }
        countyPointMap[a.countyCode].value[2]++
      })
      const mapPointsAggregated = Object.values(countyPointMap)

      const areaNameLookup = (code) => areaNameMap[code] || code
      const buildTop = (field, limit = 5, filter = null) => {
        let list = allAccommodations
        if (filter) list = list.filter(filter)
        return list
          .filter(a => a[field] != null)
          .sort((a, b) => (b[field] || 0) - (a[field] || 0))
          .slice(0, limit)
          .map(a => ({
            id: a.id,
            name: a.name,
            sub: `${areaNameLookup(a.cityCode)} · ${CATEGORY_MAP[a.category] || ''}`,
            value: a[field],
          }))
      }

      dashboardData.value = {
        totalUnits: allUnitsFull.length,
        spotCheckUnits: allUnitsFull.filter(item => item.checkType === 'catalog_spot_check').length,
        importedCheckUnits: allUnitsFull.filter(item => item.checkType === 'imported_catalog').length,
        newUnits: allUnitsFull.filter(item => item.checkType === 'new_catalog').length,
        categoryBreakdown,
        regionBreakdown,
        totalRooms: allAccommodations.reduce((s, a) => s + (a.rooms || 0), 0),
        totalBeds: allAccommodations.reduce((s, a) => s + (a.beds || 0), 0),
        totalStaff: allAccommodations.reduce((s, a) => s + (a.staffCount || 0), 0),
        operatingStatusBreakdown,
        licenseStatusBreakdown,
        mapPoints,
        mapPointsAggregated,
        rawAccommodations: allAccommodations,
        topByRooms: buildTop('rooms', 5),
        topByRevenue: buildTop('annualRevenue', 5),
      }
    } finally {
      loading.value = false
    }
  }

  return {
    dashboardData,
    loading,
    fetchDashboardData,
  }
})
