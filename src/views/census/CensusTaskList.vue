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
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="router.push(`/census/${row.id}`)">查看</el-button>
            <el-button link type="primary" size="small" @click="router.push(`/census/${row.id}/edit`)" v-if="row.status === 'draft' && authStore.hasPermission('census:update')">编辑</el-button>
            <el-button link type="success" size="small" @click="handlePublish(row)" v-if="row.status === 'draft' && authStore.hasPermission('census:create')">发布</el-button>
            <el-button link type="success" size="small" @click="handleComplete(row)" v-if="row.status === 'in_progress' && authStore.hasPermission('census:update')">完成</el-button>
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

async function handlePublish(task) {
  try {
    await ElMessageBox.confirm(`确定发布主任务「${task.title}」吗？发布后可在任务详情中继续创建子任务。`, '确认发布', { type: 'warning' })
    await store.publishTask(task.id)
    await store.startTask(task.id)
    ElMessage.success('任务已发布')
    await store.fetchTasks()
    await loadSubTaskCounts()
  } catch { /* 取消 */ }
}

async function handleComplete(task) {
  try {
    await ElMessageBox.confirm(`确定将任务「${task.title}」标记为已完成吗？`, '确认完成', { type: 'warning' })
    await store.completeTask(task.id)
    ElMessage.success('任务已完成')
    await store.fetchTasks()
    await loadSubTaskCounts()
  } catch { /* 取消 */ }
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
</script>
