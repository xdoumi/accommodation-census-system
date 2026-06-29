/**
 * 上下文构建器 - 为 AI 调用注入运行时数据
 */
import db from '@/db'
import { useAuthStore } from '@/stores/auth'

/**
 * 构建聊天上下文
 */
export async function buildChatContext() {
  const authStore = useAuthStore()
  const user = authStore.currentUser

  // 数据摘要
  let myUnits = await db.accommodations.toArray()
  if (user?.role === 'city_admin') myUnits = myUnits.filter(u => u.cityCode === user.areaCode)
  if (['county_admin', 'enumerator'].includes(user?.role)) myUnits = myUnits.filter(u => u.countyCode === user.areaCode)

  const myTasks = await db.censusTasks.toArray()
  const openTasks = myTasks.filter(t => t.status === 'in_progress')

  return {
    user: {
      name: user?.realName || '游客',
      role: user?.role || 'guest',
      areaName: user?.areaName || '',
      areaCode: user?.areaCode || '',
    },
    currentPage: {
      path: window.location.hash.replace('#', '') || '/',
      title: document.title,
    },
    data: {
      myUnits: myUnits.length,
      myTasks: myTasks.length,
      openTasks: openTasks.length,
    },
  }
}

/**
 * 构建数据摘要（用于 AI 分析查询）
 */
export async function buildDataDigest(scope = null) {
  const authStore = useAuthStore()
  let units = await db.accommodations.toArray()

  // 权限范围过滤
  if (authStore.userRole === 'city_admin') {
    units = units.filter(u => u.cityCode === authStore.userAreaCode)
  } else if (['county_admin', 'enumerator'].includes(authStore.userRole)) {
    units = units.filter(u => u.countyCode === authStore.userAreaCode)
  }

  // 自定义范围
  if (scope?.cityCode) units = units.filter(u => u.cityCode === scope.cityCode)
  if (scope?.countyCode) units = units.filter(u => u.countyCode === scope.countyCode)

  // 类别分布
  const byCategory = {}
  units.forEach(u => { byCategory[u.category] = (byCategory[u.category] || 0) + 1 })

  // 市级分布
  const byCity = {}
  units.forEach(u => { byCity[u.cityCode] = (byCity[u.cityCode] || 0) + 1 })

  // 经营状态
  const byStatus = {}
  units.forEach(u => { byStatus[u.operatingStatus] = (byStatus[u.operatingStatus] || 0) + 1 })

  // 计算平均值
  const operating = units.filter(u => u.operatingStatus === 'operating')
  const avgAdr = operating.length ? Math.round(operating.reduce((s, u) => s + (u.adr || 0), 0) / operating.length) : 0
  const avgOcc = operating.length ? Math.round(operating.reduce((s, u) => s + (u.occupancyRate || 0), 0) / operating.length * 10) / 10 : 0

  return {
    totalUnits: units.length,
    totalRooms: units.reduce((s, u) => s + (u.rooms || 0), 0),
    totalBeds: units.reduce((s, u) => s + (u.beds || 0), 0),
    totalStaff: units.reduce((s, u) => s + (u.staffCount || 0), 0),
    byCategory,
    byCity,
    byStatus,
    avgAdr,
    avgOcc,
    complianceIssues: {
      fireFailedCount: units.filter(u => u.fireInspection === 'failed').length,
      healthExpiredCount: units.filter(u => u.healthPermit === 'expired').length,
      noLicenseCount: units.filter(u => u.licenseStatus === 'none').length,
    },
  }
}
