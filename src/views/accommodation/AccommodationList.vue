<template>
  <div class="page-container">
    <SearchFilterBar :fields="filterFields" v-model="store.filters" @search="handleSearch" @reset="handleReset" />

    <el-card shadow="never">
      <div class="page-header">
        <span class="page-title">住宿单位列表</span>
        <div>
          <el-button @click="handleExport" v-if="authStore.hasPermission('accommodation:export')">
            <el-icon><Download /></el-icon>导出
          </el-button>
        </div>
      </div>

      <DataTable :data="displayRows" :loading="store.loading" :pagination="displayPagination" @page-change="handlePageChange">
        <el-table-column prop="displayName" label="单位名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="市州" width="120" align="center">
          <template #default="{ row }">{{ areaStore.getAreaName(row.cityCode) || '-' }}</template>
        </el-table-column>
        <el-table-column label="区县" width="120" align="center">
          <template #default="{ row }">{{ areaStore.getAreaName(row.countyCode) || '-' }}</template>
        </el-table-column>
        <el-table-column label="当前经营状态" width="120" align="center">
          <template #default="{ row }">{{ actualStatusText(row) || '-' }}</template>
        </el-table-column>
        <el-table-column prop="displayAddress" label="实际经营地址" min-width="260" show-overflow-tooltip />
        <el-table-column label="来源" width="90" align="center">
          <template #default="{ row }">{{ sourceText(row) }}</template>
        </el-table-column>
        <el-table-column label="核查类型" width="130" align="center">
          <template #default="{ row }">{{ checkTypeText(row) || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <StatusTag v-if="row._latestRecord" :value="row._latestRecord.status" :options="CENSUS_RECORD_STATUS_OPTIONS" />
            <el-tag v-else size="small" type="info">未填报</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
          </template>
        </el-table-column>
      </DataTable>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAccommodationStore } from '@/stores/accommodation'
import { useAuthStore } from '@/stores/auth'
import { useAreaStore } from '@/stores/area'
import { useCensusStore } from '@/stores/census'
import { ElMessage } from 'element-plus'
import { exportToExcel } from '@/utils/excel'
import { CATEGORY_OPTIONS, CENSUS_RECORD_STATUS_OPTIONS, OPERATING_STATUS_OPTIONS } from '@/utils/constants'
import { getOptionLabel } from '@/utils/collectionSpec'
import { inUserScope } from '@/utils/dataScope'
import { getFullCollectionExportColumns } from '@/utils/accommodationWorkflow'
import db from '@/db'
import SearchFilterBar from '@/components/common/SearchFilterBar.vue'
import DataTable from '@/components/common/DataTable.vue'
import StatusTag from '@/components/common/StatusTag.vue'

const router = useRouter()
const store = useAccommodationStore()
const authStore = useAuthStore()
const areaStore = useAreaStore()
const censusStore = useCensusStore()
const allAccommodations = ref([])
const latestRecordsByAccommodation = ref(new Map())
const latestRecordsByCreditCode = ref(new Map())

const accommodationRows = computed(() => allAccommodations.value.map(row => buildAccommodationDisplayRow(row)))
const allDisplayRows = computed(() => accommodationRows.value)
const displayRows = computed(() => {
  const start = (store.pagination.page - 1) * store.pagination.pageSize
  return allDisplayRows.value.slice(start, start + store.pagination.pageSize)
})
const displayPagination = computed(() => ({
  ...store.pagination,
  total: allDisplayRows.value.length,
}))

const filterFields = [
  { key: 'keyword', label: '关键词', type: 'input' },
  { key: 'category', label: '类别', type: 'select', options: CATEGORY_OPTIONS },
  { key: 'cityCode', label: '区域', type: 'cascader' },
  { key: 'operatingStatus', label: '经营状态', type: 'select', options: OPERATING_STATUS_OPTIONS },
]

onMounted(async () => {
  await areaStore.fetchAreas()
  await censusStore.fetchTasks()
  await refreshList()
})

function handleSearch() {
  store.pagination.page = 1
  refreshList()
}

function handleReset() {
  store.resetFilters()
  refreshList()
}

function handlePageChange({ page, pageSize }) {
  store.pagination.page = page
  store.pagination.pageSize = pageSize
  refreshList()
}

function handleView(row) {
  router.push(`/accommodation/${row.id}`)
}

async function handleExport() {
  const rows = allDisplayRows.value.map(row => ({
    ...row,
    displayStatus: actualStatusText(row) || '-',
    displaySource: sourceText(row),
    displayCheckType: checkTypeText(row) || '-',
    displayReviewStatus: row._latestRecord ? getRecordStatusText(row._latestRecord.status) : '已入库',
  }))
  exportToExcel(rows, getFullCollectionExportColumns(code => areaStore.getAreaName(code)), '住宿单位完整数据')
  ElMessage.success('导出成功')
}

async function refreshList() {
  await loadAccommodations()
  await loadLatestRecords()
}

async function loadAccommodations() {
  store.loading = true
  try {
    const filters = store.filters
    let list = await db.accommodations.filter(item => {
      if (!inUserScope(item, authStore.userRole, authStore.userAreaCode)) return false
      if (item.deletedAt) return false
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase()
        const hit = [
          item.name,
          item.creditCode,
          item.actualAddress,
          item.detailAddress,
        ].some(value => String(value || '').toLowerCase().includes(kw))
        if (!hit) return false
      }
      if (filters.category && item.category !== filters.category) return false
      if (filters.cityCode && item.cityCode !== filters.cityCode) return false
      if (filters.countyCode && item.countyCode !== filters.countyCode) return false
      if (filters.operatingStatus && item.operatingStatus !== filters.operatingStatus) return false
      return true
    }).toArray()
    const { field, order } = store.sortConfig
    list = list.sort((a, b) => {
      const va = a[field] ?? ''
      const vb = b[field] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return order === 'asc' ? va - vb : vb - va
      return order === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    allAccommodations.value = list
  } finally {
    store.loading = false
  }
}

async function loadLatestRecords() {
  const records = await db.censusRecords.toArray()
  records.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
  const byAccommodation = new Map()
  const byCreditCode = new Map()
  records.forEach(record => {
    if (record.accommodationId && !byAccommodation.has(record.accommodationId)) byAccommodation.set(record.accommodationId, record)
    if (record.creditCode && !byCreditCode.has(record.creditCode)) byCreditCode.set(record.creditCode, record)
  })
  latestRecordsByAccommodation.value = byAccommodation
  latestRecordsByCreditCode.value = byCreditCode
}

function latestRecordFor(row) {
  return latestRecordsByAccommodation.value.get(row.id) || latestRecordsByCreditCode.value.get(row.creditCode) || null
}

function buildAccommodationDisplayRow(row) {
  const record = latestRecordFor(row)
  const formData = parseFormData(record)
  return {
    ...row,
    _latestRecord: record,
    _formData: formData,
    displayName: formData.operatingName || formData.registeredName || formData.unitName || row.name,
    displayAddress: formData.actualAddress || formData.registeredAddress || row.actualAddress || row.detailAddress || '-',
  }
}

function parseFormData(record) {
  if (!record?.formData) return {}
  try { return JSON.parse(record.formData) } catch { return {} }
}

function actualStatusText(row) {
  const value = row._formData.actualOperatingStatus || row.actualOperatingStatus || row.operatingStatus
  return getOptionLabel('actualOperatingStatus', value) || value
}

function sourceText(row) {
  const value = row._formData.catalogSource || row._latestRecord?.catalogSource || row.catalogSource
  const label = getOptionLabel('catalogSource', value)
  if (label) return label
  if (row._latestRecord?.source === 'mobile') return '移动端'
  if (row._latestRecord?.source === 'pc') return 'PC端'
  if (row.taskTitle) return row.taskTitle
  return '名录'
}

function checkTypeText(row) {
  const value = row._formData.checkType || row._latestRecord?.checkType || row.checkType
  return getOptionLabel('checkType', value)
}

function getRecordStatusText(status) {
  return CENSUS_RECORD_STATUS_OPTIONS.find(item => item.value === status)?.label || status || '-'
}
</script>
