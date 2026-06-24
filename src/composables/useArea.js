import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAreaStore } from '@/stores/area'

export function useArea() {
  const authStore = useAuthStore()
  const areaStore = useAreaStore()

  const areaFilter = computed(() => {
    const role = authStore.userRole
    const areaCode = authStore.userAreaCode

    if (['super_admin', 'provincial_admin'].includes(role)) {
      return {} // 无过滤，看全部
    }
    if (role === 'city_admin') {
      return { cityCode: areaCode }
    }
    if (role === 'county_admin' || role === 'enumerator') {
      return { countyCode: areaCode }
    }
    return {}
  })

  const userAreaName = computed(() => authStore.currentUser?.areaName || '')

  function getAreaName(code) {
    return areaStore.getAreaName(code)
  }

  return {
    areaFilter,
    userAreaName,
    getAreaName,
  }
}
