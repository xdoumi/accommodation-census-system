<template>
  <div class="page-container">
    <el-card shadow="never">
      <div class="page-header">
        <span class="page-title">普查任务列表</span>
        <el-button type="primary" @click="router.push('/census/create')" v-if="authStore.hasPermission('census:create')">
          <el-icon><Plus /></el-icon>创建任务
        </el-button>
      </div>

      <el-table :data="store.tasks" v-loading="store.taskLoading" stripe border>
        <el-table-column prop="title" label="主任务名称" min-width="220" show-overflow-tooltip />
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
        <el-table-column label="任务范围" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ formatScope(row) }}</template>
        </el-table-column>
        <el-table-column label="子任务" width="90" align="center">
          <template #default="{ row }">{{ subTaskCount(row.id) }}个</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160" align="center">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="300" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="router.push(`/census/${row.id}`)">查看</el-button>
            <el-button link type="primary" size="small" @click="router.push(`/census/${row.id}/edit`)" v-if="row.status === 'draft' && authStore.hasPermission('census:update')">编辑</el-button>
            <el-button link type="success" size="small" @click="handleComplete(row)" v-if="row.status !== 'completed' && authStore.hasPermission('census:update')">结束</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)" v-if="row.status === 'draft' && authStore.hasPermission('census:delete')">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCensusStore } from '@/stores/census'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CENSUS_TASK_STATUS_OPTIONS } from '@/utils/constants'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { normalizeRecordStatus } from '@/utils/reviewFlow'
import StatusTag from '@/components/common/StatusTag.vue'
import db from '@/db'
import { useAreaStore } from '@/stores/area'

const router = useRouter()
const store = useCensusStore()
const authStore = useAuthStore()
const areaStore = useAreaStore()
const subTaskCounts = ref({})

onMounted(async () => {
  await areaStore.fetchAreas()
  await store.fetchTasks()
  await loadSubTaskCounts()
})

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
    await store.fetchTasks()
    await loadSubTaskCounts()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

async function handleComplete(task) {
  try {
    const check = await validateTaskCanComplete(task.id)
    if (!check.ok) {
      ElMessage.warning(check.message)
      return
    }
    await ElMessageBox.confirm(`确定结束主任务「${task.title}」吗？结束后任务状态将变为已完成。`, '结束任务', { type: 'warning' })
    await store.completeTask(task.id)
    ElMessage.success('任务已结束')
    await store.fetchTasks()
    await loadSubTaskCounts()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '结束失败')
    }
  }
}

async function validateTaskCanComplete(taskId) {
  const subTasks = await db.censusTasks.where('parentTaskId').equals(Number(taskId)).toArray()
  if (!subTasks.length) return { ok: false, message: '当前主任务还没有子任务，不能结束' }

  const subTaskIds = subTasks.map(item => item.id)
  const assignments = []
  for (const subTaskId of subTaskIds) {
    assignments.push(...await db.censusAssignments.where('taskId').equals(Number(subTaskId)).toArray())
  }
  if (!assignments.length) return { ok: false, message: '当前主任务还没有分派单位，不能结束' }

  const assignmentIds = assignments.map(item => item.id)
  const records = []
  for (const assignmentId of assignmentIds) {
    records.push(...await db.censusRecords.where('assignmentId').equals(Number(assignmentId)).toArray())
  }
  const availableRecords = records.filter(record => normalizeRecordStatus(record.status) === 'available')
  const availableByUnit = new Set(availableRecords.map(record => Number(record.accommodationId)).filter(Boolean))
  const availableByCreditCode = new Set(availableRecords.map(record => record.creditCode).filter(Boolean))
  let expectedCount = 0
  let unfinishedUnits = 0

  for (const assignment of assignments) {
    const ids = parseArray(assignment.targetAccommodationIds).map(Number).filter(Boolean)
    expectedCount += ids.length
    for (const id of ids) {
      const unit = await db.accommodations.get(id)
      const isDone = availableByUnit.has(id) || (unit?.creditCode && availableByCreditCode.has(unit.creditCode))
      if (!isDone) unfinishedUnits += 1
    }
  }

  const unfinishedRecords = records.filter(record => normalizeRecordStatus(record.status) !== 'available').length
  if (expectedCount > 0 && unfinishedUnits > 0) {
    return { ok: false, message: `还有 ${unfinishedUnits} 个任务单位未完成省级审核，不能结束任务` }
  }
  if (unfinishedRecords > 0) {
    return { ok: false, message: `还有 ${unfinishedRecords} 条普查记录未完成审核，不能结束任务` }
  }
  return { ok: true }
}

function parseArray(raw) {
  try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
}
</script>
