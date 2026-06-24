import { defineStore } from 'pinia'
import { ref } from 'vue'
import db from '@/db'
import { useAuthStore } from './auth'
import { inUserScope } from '@/utils/dataScope'
import { archiveAccommodation } from '@/utils/accommodationWorkflow'

export const useAccommodationStore = defineStore('accommodation', () => {
  const list = ref([])
  const total = ref(0)
  const currentDetail = ref(null)
  const filters = ref({
    keyword: '',
    category: '',
    cityCode: '',
    countyCode: '',
    operatingStatus: '',
    starRating: '',
  })
  const pagination = ref({ page: 1, pageSize: 20, total: 0 })
  const sortConfig = ref({ field: 'createdAt', order: 'desc' })
  const loading = ref(false)

  function buildQuery() {
    const auth = useAuthStore()

    return db.accommodations.filter(item => {
      // 区域范围过滤（统一走 dataScope 工具）
      if (!inUserScope(item, auth.userRole, auth.userAreaCode)) return false
      if (item.deletedAt) return false

      // 关键词过滤
      if (filters.value.keyword) {
        const kw = filters.value.keyword.toLowerCase()
        if (!item.name.toLowerCase().includes(kw) && !item.creditCode.toLowerCase().includes(kw)) return false
      }

      // 类别过滤
      if (filters.value.category && item.category !== filters.value.category) return false

      // 市级过滤
      if (filters.value.cityCode && item.cityCode !== filters.value.cityCode) return false

      // 县级过滤
      if (filters.value.countyCode && item.countyCode !== filters.value.countyCode) return false

      // 经营状态过滤
      if (filters.value.operatingStatus && item.operatingStatus !== filters.value.operatingStatus) return false

      // 星级过滤
      if (filters.value.starRating && item.starRating !== Number(filters.value.starRating)) return false

      return true
    })
  }

  async function fetchList() {
    loading.value = true
    try {
      const filtered = await buildQuery().toArray()

      // 排序
      const { field, order } = sortConfig.value
      filtered.sort((a, b) => {
        const va = a[field] ?? ''
        const vb = b[field] ?? ''
        if (typeof va === 'number' && typeof vb === 'number') {
          return order === 'asc' ? va - vb : vb - va
        }
        return order === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
      })

      total.value = filtered.length
      pagination.value.total = filtered.length
      const start = (pagination.value.page - 1) * pagination.value.pageSize
      list.value = filtered.slice(start, start + pagination.value.pageSize)
    } finally {
      loading.value = false
    }
  }

  async function fetchDetail(id) {
    currentDetail.value = await db.accommodations.get(Number(id))
    return currentDetail.value
  }

  async function create(data) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const id = await db.accommodations.add({
      ...data,
      createdBy: auth.currentUser?.id,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    })
    await logOperation('create', id, `新增住宿单位：${data.name}`)
    return id
  }

  async function update(id, data) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    await db.accommodations.update(Number(id), {
      ...data,
      updatedBy: auth.currentUser?.id,
      updatedAt: now,
    })
    await logOperation('update', id, `更新住宿单位：${data.name}`)
  }

  async function remove(id) {
    const item = await db.accommodations.get(Number(id))
    await archiveAccommodation(Number(id))
    await logOperation('delete', id, `删除住宿单位：${item?.name}`)
  }

  async function batchImport(rows) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const items = rows.map(row => ({
      ...row,
      provinceCode: '520000',
      createdBy: auth.currentUser?.id,
      createdAt: now,
      updatedAt: now,
    }))
    await db.accommodations.bulkAdd(items)
    await logOperation('import', null, `批量导入${items.length}条住宿单位`)
  }

  function resetFilters() {
    filters.value = { keyword: '', category: '', cityCode: '', countyCode: '', operatingStatus: '', starRating: '' }
    pagination.value.page = 1
  }

  async function logOperation(action, targetId, detail) {
    const auth = useAuthStore()
    await db.operationLogs.add({
      userId: auth.currentUser?.id,
      userName: auth.currentUser?.realName,
      action,
      module: 'accommodation',
      targetId,
      detail,
      createdAt: new Date().toISOString(),
    })
  }

  return {
    list, total, currentDetail, filters, pagination, sortConfig, loading,
    fetchList, fetchDetail, create, update, remove, batchImport, resetFilters,
  }
})
