<template>
  <div class="page-container">
    <el-card shadow="never">
      <div class="page-header">
        <span class="page-title">{{ isSubTaskMode ? '子任务列表' : '普查任务列表' }}</span>
        <el-button type="primary" @click="router.push('/census/create')" v-if="!isSubTaskMode && authStore.hasPermission('census:task:create')">
          <el-icon><Plus /></el-icon>创建任务
        </el-button>
      </div>

      <el-table :data="store.tasks" v-loading="store.taskLoading" stripe border>
        <el-table-column prop="title" :label="isSubTaskMode ? '子任务名称' : '主任务名称'" min-width="220" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <StatusTag :value="row.status" :options="CENSUS_TASK_STATUS_OPTIONS" />
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止日期" width="120" align="center">
          <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
        </el-table-column>
        <el-table-column prop="startDate" label="开始日期" width="120" align="center">
          <template #default="{ row }">{{ formatDate(row.startDate) || '-' }}</template>
        </el-table-column>
        <el-table-column v-if="!isSubTaskMode" label="任务范围" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ formatScope(row) }}</template>
        </el-table-column>
        <el-table-column v-if="!isSubTaskMode" label="子任务" width="90" align="center">
          <template #default="{ row }">{{ subTaskCount(row.id) }}个</template>
        </el-table-column>
        <el-table-column v-if="isSubTaskMode" label="分配区域" width="110" align="center">
          <template #default="{ row }">{{ countyCountByTask(row) }}个</template>
        </el-table-column>
        <el-table-column v-if="isSubTaskMode" label="单位数量" width="100" align="center">
          <template #default="{ row }">{{ taskAssignmentStats(row.id).unitCount }}</template>
        </el-table-column>
        <el-table-column v-if="isSubTaskMode" label="分配抽查量" width="120" align="center">
          <template #default="{ row }">{{ taskAssignmentStats(row.id).allocatedSpot }}</template>
        </el-table-column>
        <el-table-column v-if="isSubTaskMode" label="抽查-县级待审" width="130" align="center">
          <template #default="{ row }">{{ taskRecordStats(row.id).spotCountyPending }}</template>
        </el-table-column>
        <el-table-column v-if="isSubTaskMode" label="实际抽查" width="110" align="center">
          <template #default="{ row }">{{ taskRecordStats(row.id).actualSpot }}</template>
        </el-table-column>
        <el-table-column v-if="isSubTaskMode" label="分配核查量" width="120" align="center">
          <template #default="{ row }">{{ taskAssignmentStats(row.id).allocatedImported }}</template>
        </el-table-column>
        <el-table-column v-if="isSubTaskMode" label="核查-县级待审" width="130" align="center">
          <template #default="{ row }">{{ taskRecordStats(row.id).importedCountyPending }}</template>
        </el-table-column>
        <el-table-column v-if="isSubTaskMode" label="实际核查" width="110" align="center">
          <template #default="{ row }">{{ taskRecordStats(row.id).actualImported }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160" align="center">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="300" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="router.push(`/census/${row.id}`)">查看</el-button>
            <el-button link type="primary" size="small" @click="router.push(`/census/${row.id}/edit`)" v-if="authStore.hasPermission('census:task:update')">编辑</el-button>
            <el-button link type="success" size="small" @click="handleStart(row)" v-if="row.status !== 'in_progress' && authStore.hasPermission('census:task:toggle')">启动</el-button>
            <el-button link type="warning" size="small" @click="handleComplete(row)" v-if="row.status === 'in_progress' && authStore.hasPermission('census:task:toggle')">结束</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)" v-if="row.status === 'draft' && authStore.hasPermission('census:task:delete')">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCensusStore } from '@/stores/census'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CENSUS_TASK_STATUS_OPTIONS } from '@/utils/constants'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { normalizeRecordStatus } from '@/utils/reviewFlow'
import { buildAssignmentStats, buildRecordStats as buildTaskRecordStats, parseJsonArray } from '@/utils/taskMetrics'
import StatusTag from '@/components/common/StatusTag.vue'
import db from '@/db'
import { useAreaStore } from '@/stores/area'

const router = useRouter()
const route = useRoute()
const store = useCensusStore()
const authStore = useAuthStore()
const areaStore = useAreaStore()
const subTaskCounts = ref({})
const recordStatsByTask = ref({})
const assignmentStatsByTask = ref({})
const isSubTaskMode = computed(() => route.query.taskType === 'sub')

onMounted(async () => {
  await areaStore.fetchAreas()
  await fetchTaskRows()
  await loadSubTaskCounts()
  await loadAssignmentStats()
  await loadRecordStats()
})

watch(() => route.query.taskType, async () => {
  await fetchTaskRows()
  await loadSubTaskCounts()
  await loadAssignmentStats()
  await loadRecordStats()
})

async function fetchTaskRows() {
  await store.fetchTasks({ taskType: isSubTaskMode.value ? 'sub' : 'main' })
}

async function loadSubTaskCounts() {
  const all = await db.censusTasks.toArray()
  subTaskCounts.value = all.reduce((acc, task) => {
    if (task.parentTaskId) acc[task.parentTaskId] = (acc[task.parentTaskId] || 0) + 1
    return acc
  }, {})
}

function subTaskCount(taskId) {
  return subTaskCounts.value[taskId] || 0
}

function taskRecordStats(taskId) {
  return recordStatsByTask.value[taskId] || { importedCountyPending: 0, spotCountyPending: 0, actualSpot: 0, actualImported: 0 }
}

function taskAssignmentStats(taskId) {
  return assignmentStatsByTask.value[taskId] || { unitCount: 0, allocatedSpot: 0, allocatedImported: 0 }
}

async function loadAssignmentStats() {
  if (!isSubTaskMode.value) {
    assignmentStatsByTask.value = {}
    return
  }
  const next = {}
  for (const task of store.tasks) {
    const assignments = await db.censusAssignments.where('taskId').equals(Number(task.id)).toArray()
    next[task.id] = buildAssignmentStats(assignments)
  }
  assignmentStatsByTask.value = next
}

async function loadRecordStats() {
  if (!isSubTaskMode.value) {
    recordStatsByTask.value = {}
    return
  }
  const next = {}
  for (const task of store.tasks) {
    const assignments = await db.censusAssignments.where('taskId').equals(Number(task.id)).toArray()
    const records = []
    for (const assignment of assignments) {
      records.push(...await db.censusRecords.where('assignmentId').equals(Number(assignment.id)).toArray())
    }
    next[task.id] = buildTaskRecordStats(records)
  }
  recordStatsByTask.value = next
}

function formatScope(row) {
  if (row.scopeType === 'province') return '贵州省全省'
  let codes = []
  try { codes = JSON.parse(row.scopeAreaCodes || row.assignedAreaCodes || '[]') } catch {}
  return codes.map(code => areaStore.getAreaName(code)).join('、') || '-'
}

async function handleDelete(task) {
  try {
    await ElMessageBox.confirm(`确定删除草稿任务「${task.title}」吗？删除后不可恢复。`, '确认删除', { type: 'warning' })
    await store.removeTask(task.id)
    ElMessage.success('任务已删除')
    await fetchTaskRows()
    await loadSubTaskCounts()
    await loadAssignmentStats()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

async function handleStart(task) {
  await store.startTask(task.id)
  ElMessage.success('任务已启动')
  await fetchTaskRows()
  await loadSubTaskCounts()
  await loadAssignmentStats()
  await loadRecordStats()
}

async function handleComplete(task) {
  try {
    const check = isSubTaskMode.value
      ? await validateSubTaskCanComplete(task.id)
      : await validateMainTaskCanComplete(task.id)
    if (!check.ok) {
      ElMessage.warning(check.message)
      return
    }
    await ElMessageBox.confirm(`确定结束${isSubTaskMode.value ? '子任务' : '主任务'}「${task.title}」吗？`, '结束任务', { type: 'warning' })
    await store.completeTask(task.id)
    ElMessage.success('任务已结束')
    await fetchTaskRows()
    await loadSubTaskCounts()
    await loadAssignmentStats()
    await loadRecordStats()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '结束失败')
    }
  }
}

async function validateMainTaskCanComplete(taskId) {
  const subTasks = await db.censusTasks.where('parentTaskId').equals(Number(taskId)).toArray()
  if (!subTasks.length) return { ok: false, message: '当前主任务还没有子任务，不能结束' }
  const unfinished = subTasks.filter(task => task.status !== 'completed')
  if (unfinished.length) return { ok: false, message: `还有 ${unfinished.length} 个子任务未结束，不能结束主任务` }
  return { ok: true }
}

async function validateSubTaskCanComplete(taskId) {
  const assignments = []
  assignments.push(...await db.censusAssignments.where('taskId').equals(Number(taskId)).toArray())
  if (!assignments.length) return { ok: false, message: '当前子任务还没有分派单位，不能结束' }

  const records = []
  for (const assignment of assignments) {
    records.push(...await db.censusRecords.where('assignmentId').equals(Number(assignment.id)).toArray())
  }
  const assignmentStats = buildAssignmentStats(assignments)
  const recordStats = buildTaskRecordStats(records)
  if (assignmentStats.allocatedImported > recordStats.actualImported) {
    return { ok: false, message: `还有 ${assignmentStats.allocatedImported - recordStats.actualImported} 个核查任务未进入市级待审，不能结束` }
  }
  if (assignmentStats.allocatedSpot > recordStats.actualSpot) {
    return { ok: false, message: `实际抽查未达到分配抽查量，还差 ${assignmentStats.allocatedSpot - recordStats.actualSpot} 条，不能结束` }
  }
  return { ok: true }
}

function getRecordCheckType(record) {
  if (record.checkType) return record.checkType
  try { return JSON.parse(record.formData || '{}').checkType || '' } catch { return '' }
}

function countyCountByTask(task) {
  return expandAssignedCountyCodes(parseJsonArray(task.assignedAreaCodes)).length
}

function expandAssignedCountyCodes(areaCodes = []) {
  const selected = Array.isArray(areaCodes) ? areaCodes : []
  const countySet = new Set()
  const allCounties = areaStore.areas.filter(item => item.level === 3)
  if (!selected.length || selected.includes('520000')) {
    allCounties.forEach(item => countySet.add(item.code))
    return [...countySet]
  }
  selected.forEach(code => {
    const area = areaStore.getAreaByCode(code)
    if (!area) return
    if (area.level === 1 || code === '520000') {
      allCounties.forEach(item => countySet.add(item.code))
      return
    }
    if (area.level === 2 || code.endsWith('00')) {
      areaStore.getCountiesByCity(code).forEach(item => countySet.add(item.code))
      return
    }
    countySet.add(code)
  })
  return [...countySet]
}
</script>
