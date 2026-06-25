<template>
  <div style="padding-bottom: 16px;" v-loading="loading">
    <template v-if="task">
      <div class="m-card task-hero" style="border-radius: 0 0 16px 16px; margin-top: 0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div style="min-width: 0; flex: 1;">
            <h3 style="margin: 0; font-size: 17px; line-height: 1.4;">{{ task.title }}</h3>
            <p style="color: #909399; font-size: 13px; margin-top: 8px; line-height: 1.5;">{{ task.description }}</p>
          </div>
          <StatusTag :value="task.status" :options="CENSUS_TASK_STATUS_OPTIONS" style="flex-shrink: 0;" />
        </div>
        <div class="task-meta-line">
          <span><el-icon><Calendar /></el-icon> 截止：{{ formatDate(task.deadline) }}</span>
          <span>单位 {{ taskUnits.length }} 个</span>
        </div>
      </div>

      <div class="m-card">
        <div class="search-header">
          <input v-model.trim="keyword" class="m-input" placeholder="搜索单位名称" />
          <el-button
            v-if="showAddButton"
            type="primary"
            size="small"
            @click="handleCreateUnit"
          >
            新增
          </el-button>
        </div>

        <div v-if="filteredUnits.length === 0" class="empty-panel">
          <el-icon :size="48" color="#dcdfe6"><OfficeBuilding /></el-icon>
          <p>{{ keyword ? '当前任务名单中没有这个单位' : '当前任务暂无单位' }}</p>
        </div>

        <div
          v-for="item in filteredUnits"
          :key="item.id"
          class="unit-card"
          @click="openUnit(item)"
        >
          <div class="unit-card-head">
            <div style="min-width: 0; flex: 1;">
              <div class="unit-name">{{ item.name }}</div>
              <div class="unit-address">{{ item.detailAddress || '暂无地址' }}</div>
            </div>
            <StatusTag
              :value="item.recordStatus || 'draft_placeholder'"
              :options="statusOptions"
              style="flex-shrink: 0;"
            />
          </div>
          <div class="unit-grid">
            <div><span>来源</span>{{ sourceText(item) }}</div>
            <div><span>核查类型</span>{{ getOptionLabel('checkType', item.checkType) || '-' }}</div>
            <div><span>信用代码</span>{{ item.creditCode || '-' }}</div>
            <div><span>当前状态</span>{{ item.recordStatusLabel }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCensusStore } from '@/stores/census'
import { useAuthStore } from '@/stores/auth'
import { CENSUS_RECORD_STATUS_OPTIONS, CENSUS_TASK_STATUS_OPTIONS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'
import { getOptionLabel } from '@/utils/collectionSpec'
import { normalizeRecordStatus } from '@/utils/reviewFlow'
import StatusTag from '@/components/common/StatusTag.vue'
import db from '@/db'

const route = useRoute()
const router = useRouter()
const censusStore = useCensusStore()
const authStore = useAuthStore()

const task = ref(null)
const loading = ref(true)
const keyword = ref('')
const taskUnits = ref([])

const statusOptions = computed(() => [
  ...CENSUS_RECORD_STATUS_OPTIONS,
  { value: 'draft_placeholder', label: '未填报', type: 'info' },
])

const filteredUnits = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return taskUnits.value
  return taskUnits.value.filter(item => String(item.name || '').toLowerCase().includes(kw))
})

const showAddButton = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return false
  return !taskUnits.value.some(item => String(item.name || '').trim().toLowerCase() === kw.toLowerCase())
})

onMounted(async () => {
  await censusStore.fetchTaskDetail(route.params.id)
  task.value = censusStore.currentTask
  await loadTaskUnits()
  loading.value = false
})

async function loadTaskUnits() {
  const ids = new Set()
  const assignmentByAccommodation = new Map()
  censusStore.assignments.forEach(assignment => {
    parseArray(assignment.targetAccommodationIds).forEach(id => {
      const numericId = Number(id)
      ids.add(numericId)
      if (!assignmentByAccommodation.has(numericId)) assignmentByAccommodation.set(numericId, assignment.id)
    })
  })

  const allRecords = []
  for (const assignment of censusStore.assignments) {
    allRecords.push(...await db.censusRecords.where('assignmentId').equals(Number(assignment.id)).toArray())
  }
  allRecords.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))

  const nextRecordMap = new Map()
  allRecords.forEach(record => {
    const key = buildRecordKey(record)
    if (key && !nextRecordMap.has(key)) nextRecordMap.set(key, record)
  })
  const rows = []
  for (const id of ids) {
    const unit = await db.accommodations.get(id)
    if (!unit || unit.deletedAt) continue
    const assignmentId = assignmentByAccommodation.get(id) || null
    const record = nextRecordMap.get(`unit:${id}`) || nextRecordMap.get(`credit:${unit.creditCode}`) || null
    rows.push({
      ...unit,
      assignmentId,
      recordId: record?.id || null,
      recordStatus: record ? normalizeRecordStatus(record.status) : '',
      recordStatusLabel: getRecordStatusLabel(record?.status),
    })
  }
  taskUnits.value = rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
}

function parseArray(raw) {
  try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
}

function buildRecordKey(record) {
  if (record.accommodationId) return `unit:${record.accommodationId}`
  if (record.creditCode) return `credit:${record.creditCode}`
  return ''
}

function getRecordStatusLabel(status) {
  if (!status) return '未填报'
  const normalized = normalizeRecordStatus(status)
  return CENSUS_RECORD_STATUS_OPTIONS.find(item => item.value === normalized)?.label || normalized
}

function sourceText(item) {
  return getOptionLabel('catalogSource', item.catalogSource) || '-'
}

function openUnit(item) {
  const query = { unitId: String(item.id) }
  if (item.recordId) query.recordId = String(item.recordId)
  router.push({ path: `/m/entry/${route.params.id}/${item.assignmentId || 0}`, query })
}

async function handleCreateUnit() {
  const name = keyword.value.trim()
  if (!name) return
  const assignmentId = await resolveAssignmentIdForCreate()
  router.push({
    path: `/m/entry/${route.params.id}/${assignmentId || 0}`,
    query: { unitName: name },
  })
}

async function resolveAssignmentIdForCreate() {
  if (censusStore.assignments.length <= 1) return censusStore.assignments[0]?.id || 0
  const exactMatch = censusStore.assignments.find(item => item.areaCode === authStore.userAreaCode)
  if (exactMatch) return exactMatch.id
  const cityPrefix = String(authStore.userAreaCode || '').substring(0, 4)
  const cityMatch = censusStore.assignments.find(item => String(item.areaCode || '').startsWith(cityPrefix))
  return cityMatch?.id || censusStore.assignments[0]?.id || 0
}
</script>

<style lang="scss" scoped>
.task-hero {
  box-shadow: 0 10px 28px rgba(17, 24, 39, 0.08);
}

.task-meta-line {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #909399;
  font-size: 12px;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.empty-panel {
  padding: 40px 0 28px;
  text-align: center;
  color: #909399;
}

.unit-card {
  margin-top: 12px;
  padding: 14px;
  border-radius: 14px;
  background: #fafcff;
  border: 1px solid #e7eef8;
}

.unit-card:active {
  transform: scale(0.995);
}

.unit-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.unit-name {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.unit-address {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.unit-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  font-size: 12px;
  color: #303133;

  span {
    display: block;
    margin-bottom: 2px;
    color: #909399;
  }
}
</style>
