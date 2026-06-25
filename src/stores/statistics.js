import { defineStore } from 'pinia'
import { ref } from 'vue'
import db from '@/db'
import { useAuthStore } from './auth'
import { filterByScope } from '@/utils/dataScope'
import { getOptionLabel } from '@/utils/collectionSpec'

export const useStatisticsStore = defineStore('statistics', () => {
  const dashboardData = ref({
    totalUnits: 0,
    spotCheckUnits: 0,
    importedCheckUnits: 0,
    newUnits: 0,
    ratingBreakdown: [],
    sourceBreakdown: [],
    checkTypeBreakdown: [],
    industryBreakdown: [],
    totalRooms: 0,
    totalBeds: 0,
    totalStaff: 0,
    operatingStatusBreakdown: [],
    mapPoints: [],
    mapPointsAggregated: [],
    rawAccommodations: [],     // 原始数据（已经做过权限过滤），用于上层趋势/排行
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

      // 获取区域名称
      const areas = await db.areas.toArray()
      const areaNameMap = Object.fromEntries(areas.map(a => [a.code, a.name]))

      const buildBreakdown = (field, labeler = value => value || '未填写') => {
        const map = {}
        allAccommodations.forEach(item => {
          const raw = item[field] || ''
          const label = labeler(raw)
          map[label] = (map[label] || 0) + 1
        })
        return Object.entries(map).map(([name, value]) => ({ name, value }))
      }

      const ratingBreakdown = buildBreakdown('ratingLevel', value => getOptionLabel('ratingLevel', value) || '未填写')
      const sourceBreakdown = buildBreakdown('catalogSource', value => getOptionLabel('catalogSource', value) || '未填写')
      const checkTypeBreakdown = buildBreakdown('checkType', value => getOptionLabel('checkType', value) || '未填写')
      const industryBreakdown = buildBreakdown('economyIndustryCode', value => industryName(value))

      // 经营状态分布
      const statusMap = {}
      allAccommodations.forEach(a => { statusMap[a.operatingStatus] = (statusMap[a.operatingStatus] || 0) + 1 })
      const statusLabels = { operating: '正常营业', closed: '停业', renovating: '装修中', suspended: '暂停营业' }
      const operatingStatusBreakdown = Object.entries(statusMap).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }))

      // 地图点位数据
      const mapPoints = allAccommodations
        .filter(a => a.longitude && a.latitude)
        .map(a => ({ name: a.name, value: [a.longitude, a.latitude, 1], category: a.ratingLevel }))

      // 聚合地图数据到区县级别
      const countyPointMap = {}
      allAccommodations.filter(a => a.longitude && a.latitude).forEach(a => {
        if (!countyPointMap[a.countyCode]) {
          countyPointMap[a.countyCode] = { name: areaNameMap[a.countyCode] || a.countyCode, value: [a.longitude, a.latitude, 0] }
        }
        countyPointMap[a.countyCode].value[2]++
      })
      const mapPointsAggregated = Object.values(countyPointMap)

      dashboardData.value = {
        totalUnits: allUnitsFull.length,
        spotCheckUnits: allUnitsFull.filter(item => item.checkType === 'catalog_spot_check').length,
        importedCheckUnits: allUnitsFull.filter(item => item.checkType === 'imported_catalog').length,
        newUnits: allUnitsFull.filter(item => item.checkType === 'new_catalog').length,
        ratingBreakdown,
        sourceBreakdown,
        checkTypeBreakdown,
        industryBreakdown,
        totalRooms: allAccommodations.reduce((s, a) => s + (a.rooms || 0), 0),
        totalBeds: allAccommodations.reduce((s, a) => s + (a.beds || 0), 0),
        totalStaff: allAccommodations.reduce((s, a) => s + (a.staffCount || 0), 0),
        operatingStatusBreakdown,
        mapPoints,
        mapPointsAggregated,
        rawAccommodations: allAccommodations,
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

function industryName(value) {
  const label = getOptionLabel('economyIndustryCode', value)
  if (!label) return '未填写'
  return label.replace(/^\d+\*?/, '') || label
}
