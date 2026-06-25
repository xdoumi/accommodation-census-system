<template>
  <div class="page-container review-page">
    <el-card class="hero-card" shadow="never">
      <div>
        <div class="eyebrow">住宿单位审核</div>
        <h2>审核单位列表</h2>
        <p>移动端新增或修改的单位会进入这里，按县级、市级、省级逐级审核；省级通过后同步更新住宿单位列表。</p>
      </div>
      <div class="hero-stats">
        <div><strong>{{ rows.length }}</strong><span>全部记录</span></div>
        <div><strong>{{ pendingCount }}</strong><span>待当前级审核</span></div>
        <div><strong>{{ availableCount }}</strong><span>已可用</span></div>
      </div>
    </el-card>

    <el-card shadow="never" class="filter-panel">
      <el-form :inline="true" :model="filters">
        <el-form-item label="单位名称">
          <el-input v-model="filters.keyword" clearable placeholder="搜索单位名称" style="width: 240px" @keyup.enter="loadRows" />
        </el-form-item>
        <el-form-item label="区域">
          <AreaMultiSelect v-model="filters.areaCodes" />
        </el-form-item>
        <el-form-item label="任务状态">
          <el-select v-model="filters.status" clearable placeholder="请选择状态" style="width: 170px">
            <el-option v-for="opt in CENSUS_RECORD_STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="loadRows">查询</el-button>
          <el-button :icon="RefreshLeft" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <DataTable :data="pagedRows" :loading="loading" :pagination="pagination" @page-change="handlePageChange">
        <el-table-column prop="displayName" label="单位名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="市州" width="120" align="center">
          <template #default="{ row }">{{ areaStore.getAreaName(row.cityCode) || '-' }}</template>
        </el-table-column>
        <el-table-column label="区县" width="120" align="center">
          <template #default="{ row }">{{ areaStore.getAreaName(row.countyCode) || '-' }}</template>
        </el-table-column>
        <el-table-column label="当前经营状态" width="120" align="center">
          <template #default="{ row }">{{ getOptionLabel('actualOperatingStatus', row.actualOperatingStatus) || '-' }}</template>
        </el-table-column>
        <el-table-column prop="displayAddress" label="实际经营地址" min-width="240" show-overflow-tooltip />
        <el-table-column label="来源" width="90" align="center">
          <template #default="{ row }">{{ sourceText(row) }}</template>
        </el-table-column>
        <el-table-column label="核查类型" width="130" align="center">
          <template #default="{ row }">{{ getOptionLabel('checkType', row.checkType) || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="130" align="center">
          <template #default="{ row }"><StatusTag :value="row.status" :options="CENSUS_RECORD_STATUS_OPTIONS" /></template>
        </el-table-column>
        <el-table-column prop="status" label="状态值" width="180" align="center" show-overflow-tooltip />
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openRecord(row)">查看</el-button>
            <el-button v-if="canCurrentUserReview(row)" link type="success" size="small" @click="reviewRecord(row, 'approve')">{{ currentReviewStep?.approveText || '通过' }}</el-button>
            <el-button v-if="canCurrentUserReview(row)" link type="danger" size="small" @click="reviewRecord(row, 'reject')">{{ currentReviewStep?.rejectText || '驳回' }}</el-button>
            <el-button link type="danger" size="small" @click="deleteRecord(row)">删除</el-button>
          </template>
        </el-table-column>
      </DataTable>
    </el-card>

    <el-drawer v-model="drawerVisible" title="审核记录详情" size="640px">
      <div v-if="activeRow">
        <el-descriptions :column="2" border class="summary-descriptions">
          <el-descriptions-item label="单位名称" :span="2">{{ activeRow.displayName }}</el-descriptions-item>
          <el-descriptions-item label="市州">{{ areaStore.getAreaName(activeRow.cityCode) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="区县">{{ areaStore.getAreaName(activeRow.countyCode) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态"><StatusTag :value="activeRow.status" :options="CENSUS_RECORD_STATUS_OPTIONS" /></el-descriptions-item>
          <el-descriptions-item label="状态值">{{ activeRow.status || '-' }}</el-descriptions-item>
          <el-descriptions-item label="提交来源">{{ sourceText(activeRow) }}</el-descriptions-item>
        </el-descriptions>

        <div v-for="group in previewGroups" :key="group.module.key" class="record-section">
          <h3>{{ group.module.title }}</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item v-for="item in group.items" :key="item.key" :label="item.field.label">
              <img v-if="item.field.type === 'signature' && item.value" class="signature-image" :src="item.value" alt="住宿单位负责人签字" />
              <span v-else>{{ formatCollectionValue(item.key, item.field, item.value, activeForm) || '-' }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshLeft, Search } from '@element-plus/icons-vue'
import db from '@/db'
import { useAuthStore } from '@/stores/auth'
import { useAreaStore } from '@/stores/area'
import { CENSUS_RECORD_STATUS_OPTIONS } from '@/utils/constants'
import { buildReviewPatch, canReviewRecord, getReviewStepForRole, isReviewerInScope } from '@/utils/reviewFlow'
import { COLLECTION_FIELD_MAP, COLLECTION_MODULES, getOptionLabel, getVisibleModuleFields, shouldSkipBusinessModule } from '@/utils/collectionSpec'
import { archiveCensusRecord, buildDisplayAddress, buildDisplayName, formatCollectionValue, parseRecordFormData, publishRecordToAccommodation } from '@/utils/accommodationWorkflow'
import AreaMultiSelect from '@/components/common/AreaMultiSelect.vue'
import DataTable from '@/components/common/DataTable.vue'
import StatusTag from '@/components/common/StatusTag.vue'

const authStore = useAuthStore()
const areaStore = useAreaStore()

const loading = ref(false)
const rows = ref([])
const activeRow = ref(null)
const drawerVisible = ref(false)
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const filters = reactive({ keyword: '', areaCodes: ['520000'], status: '' })
const currentReviewStep = computed(() => getReviewStepForRole(authStore.userRole))
const pendingCount = computed(() => rows.value.filter(row => canCurrentUserReview(row)).length)
const availableCount = computed(() => rows.value.filter(row => row.status === 'available').length)
const pagedRows = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  return rows.value.slice(start, start + pagination.value.pageSize)
})
const activeForm = computed(() => activeRow.value?._formData || {})
const previewGroups = computed(() => COLLECTION_MODULES.filter(m => m.key !== 'PREVIEW').map(module => {
  const fieldKeys = module.key === 'B' && shouldSkipBusinessModule(activeForm.value) ? [] : getVisibleModuleFields(module, activeForm.value)
  return {
    module,
    items: fieldKeys.map(key => ({ key, field: COLLECTION_FIELD_MAP[key], value: activeForm.value[key] })).filter(item => item.field),
  }
}).filter(group => group.items.length > 0))

onMounted(async () => {
  await areaStore.fetchAreas()
  await loadRows()
})

async function loadRows() {
  loading.value = true
  try {
    const [records, assignments, tasks] = await Promise.all([
      db.censusRecords.toArray(),
      db.censusAssignments.toArray(),
      db.censusTasks.toArray(),
    ])
    const assignmentById = new Map(assignments.map(item => [item.id, item]))
    const taskById = new Map(tasks.map(item => [item.id, item]))
    rows.value = records
      .filter(record => record.status !== 'draft')
      .map(record => decorateRecord(record, assignmentById.get(record.assignmentId), taskById.get(record.taskId)))
      .filter(row => inReviewScope(row))
      .filter(matchesFilters)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    pagination.value.total = rows.value.length
  } finally {
    loading.value = false
  }
}

function decorateRecord(record, assignment, task) {
  const formData = parseRecordFormData(record)
  const assignmentAreaCode = assignment?.areaCode || ''
  const assignmentCityCode = assignmentAreaCode
    ? (assignmentAreaCode.endsWith('00') ? assignmentAreaCode : `${assignmentAreaCode.slice(0, 4)}00`)
    : ''
  return {
    ...record,
    _formData: formData,
    _assignment: assignment,
    _task: task,
    displayName: buildDisplayName(record, formData),
    displayAddress: buildDisplayAddress(record, formData),
    cityCode: formData.divisionCityCode || assignmentCityCode,
    countyCode: formData.divisionCountyCode || (assignmentAreaCode.endsWith('00') ? '' : assignmentAreaCode),
    actualOperatingStatus: formData.actualOperatingStatus || '',
    checkType: record.checkType || formData.checkType || '',
    catalogSource: record.catalogSource || formData.catalogSource || '',
  }
}

function inReviewScope(row) {
  if (isReviewerInScope(row._assignment, authStore.userRole, authStore.currentUser?.id, authStore.userAreaCode)) return true
  return row.filledBy === authStore.currentUser?.id
}

function matchesFilters(row) {
  if (filters.keyword) {
    const kw = filters.keyword.trim().toLowerCase()
    const hit = [row.displayName].some(value => String(value || '').toLowerCase().includes(kw))
    if (!hit) return false
  }
  if (!matchesAreaCodes(row, filters.areaCodes)) return false
  if (filters.status && row.status !== filters.status) return false
  return true
}

function resetFilters() {
  filters.keyword = ''
  filters.areaCodes = ['520000']
  filters.status = ''
  pagination.value.page = 1
  loadRows()
}

function handlePageChange({ page, pageSize }) {
  pagination.value.page = page
  pagination.value.pageSize = pageSize
}

function openRecord(row) {
  activeRow.value = row
  drawerVisible.value = true
}

function canCurrentUserReview(row) {
  return authStore.hasPermission('census:review')
    && canReviewRecord(row, authStore.userRole)
    && isReviewerInScope(row._assignment, authStore.userRole, authStore.currentUser?.id, authStore.userAreaCode)
}

async function reviewRecord(row, action) {
  try {
    const patch = buildReviewPatch(row, authStore.userRole, action, authStore.currentUser?.id)
    await db.censusRecords.update(row.id, patch)
    Object.assign(row, patch)
    if (patch.status === 'available') await publishRecordToAccommodation(row)
    ElMessage.success(action === 'approve' ? (patch.status === 'available' ? '省级审核通过，已同步到住宿单位列表' : '已提交下一级审核') : '已驳回')
    await loadRows()
  } catch (error) {
    ElMessage.error(error.message || '审核失败')
  }
}

async function deleteRecord(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.displayName}」的审核记录吗？删除后可在删除管理中恢复。`, '删除确认', { type: 'warning' })
    await archiveCensusRecord(row.id, '审核单位列表删除')
    ElMessage.success('已删除，记录已进入删除管理')
    await loadRows()
  } catch { /* cancel */ }
}

function sourceText(row) {
  if (row.catalogSource) return getOptionLabel('catalogSource', row.catalogSource) || row.catalogSource
  if (row.source === 'mobile') return '移动端'
  if (row.source === 'pc') return 'PC端'
  return row._task?.title || '-'
}

function matchesAreaCodes(row, areaCodes = []) {
  if (!Array.isArray(areaCodes) || !areaCodes.length || areaCodes.includes('520000')) return true
  const selectedCities = areaCodes.filter(code => code.length === 6 && code.endsWith('00'))
  const selectedCounties = areaCodes.filter(code => code.length === 6 && !code.endsWith('00'))
  if (selectedCities.includes(row.cityCode)) return true
  if (selectedCounties.includes(row.countyCode)) return true
  return false
}
</script>

<style scoped>
.review-page {
  --brand: #1a5fc5;
}

.hero-card {
  margin-bottom: 14px;
  border: 1px solid #e5edf8;
}

.hero-card :deep(.el-card__body) {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
}

.eyebrow {
  font-size: 12px;
  font-weight: 700;
  color: var(--brand);
}

.hero-card h2 {
  margin: 4px 0 6px;
  font-size: 22px;
  color: #1f2937;
}

.hero-card p {
  margin: 0;
  color: #606266;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 96px);
  gap: 10px;
}

.hero-stats div {
  padding: 12px;
  border-radius: 8px;
  background: #f5f8fd;
  text-align: center;
}

.hero-stats strong {
  display: block;
  font-size: 22px;
  color: var(--brand);
}

.hero-stats span {
  font-size: 12px;
  color: #606266;
}

.filter-panel {
  margin-bottom: 14px;
}

.filter-panel :deep(.el-card__body) {
  padding-bottom: 0;
}

.summary-descriptions {
  margin-bottom: 16px;
}

.record-section {
  margin-bottom: 18px;
}

.record-section h3 {
  margin: 0 0 10px;
  font-size: 15px;
  color: #1f2937;
}

.signature-image {
  display: block;
  max-width: 360px;
  width: 100%;
  max-height: 120px;
  object-fit: contain;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}
</style>
