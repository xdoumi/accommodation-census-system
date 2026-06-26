<template>
  <div style="padding-bottom: 16px;">
    <!-- 顶部欢迎 -->
    <div class="m-card" style="background: linear-gradient(135deg, #1a5fc5, #4a80d4); color: #fff; margin-top: 0; border-radius: 0 0 16px 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 20px; font-weight: 600;">{{ greeting }}，{{ authStore.currentUser?.realName }}</h2>
          <p style="margin: 6px 0 0; opacity: 0.85; font-size: 14px;">{{ authStore.currentUser?.areaName }} · {{ getRoleLabel(authStore.userRole) }}</p>
        </div>
        <el-avatar :size="48" :icon="UserFilled" style="background: rgba(255,255,255,0.2);" />
      </div>
    </div>

    <!-- 待办统计 -->
    <div class="m-card" style="margin-top: -24px; position: relative; z-index: 1;">
      <el-row :gutter="12">
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-value" style="color: #1a5fc5;">{{ todoCount }}</div>
            <div class="stat-label">待填报</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-value" style="color: #e6a23c;">{{ inProgressCount }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-value" style="color: #67c23a;">{{ completedCount }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="m-card progress-card">
      <div class="progress-row">
        <div>
          <div class="progress-title">核查任务执行进度</div>
          <div class="progress-sub">{{ completedAssignments }}/{{ totalAssignments }} 个分配区域完成</div>
        </div>
        <strong>{{ executionProgress }}%</strong>
      </div>
      <el-progress :percentage="executionProgress" :stroke-width="8" :show-text="false" />
      <div class="progress-row review">
        <div>
          <div class="progress-title">审核进度</div>
          <div class="progress-sub">{{ reviewedRecords }}/{{ totalRecords }} 条记录通过审核</div>
        </div>
        <strong>{{ reviewProgress }}%</strong>
      </div>
      <el-progress :percentage="reviewProgress" :stroke-width="8" :show-text="false" color="#67c23a" />
    </div>

    <div class="task-section">
      <div class="section-head">
        <div>
          <div class="section-kicker">当前下发任务</div>
          <h3>我的子任务</h3>
        </div>
        <span>{{ filteredTasks.length }} 个</span>
      </div>

      <div class="filter-tabs">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          type="button"
          class="filter-chip"
          :class="{ active: activeFilter === tab.value }"
          @click="activeFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="filteredTasks.length === 0" class="m-card empty-state">
        <el-icon :size="42" color="#dcdfe6"><Document /></el-icon>
        <p>暂无子任务</p>
      </div>

      <div
        v-for="item in filteredTasks"
        :key="item.taskId"
        class="m-card assignment-card"
        @click="openTask(item)"
      >
        <div class="card-head">
          <div>
            <div class="task-title">{{ item.taskTitle }}</div>
            <div class="task-meta">{{ item.areaSummary }} · {{ item.assignedToName || '待分配' }}</div>
          </div>
          <StatusTag :value="item.displayStatus" :options="CENSUS_ASSIGNMENT_STATUS_OPTIONS" />
        </div>
        <div class="metric-grid">
          <div><strong>{{ item.unitCount || 0 }}</strong><span>单位数量</span></div>
          <div><strong>{{ item.spotCheckCount || 0 }}</strong><span>抽查数量</span></div>
          <div><strong>{{ item.importedCheckCount || 0 }}</strong><span>核查数量</span></div>
        </div>
        <el-progress :percentage="item.progress || 0" :stroke-width="8" :show-text="false" />
        <div class="card-foot">
          <span>截止：{{ formatDate(item.deadline) || '-' }}</span>
          <div class="card-actions">
            <el-button
              v-if="item.taskStatus !== 'completed'"
              size="small"
              :loading="completingTaskId === item.taskId"
              @click.stop="handleCompleteTask(item)"
            >
              结束任务
            </el-button>
            <el-button type="primary" size="small" @click.stop="openTask(item)">查看单位</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCensusStore } from '@/stores/census'
import { useStatisticsStore } from '@/stores/statistics'
import { CENSUS_ASSIGNMENT_STATUS_OPTIONS, getRoleLabel } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'
import { normalizeRecordStatus } from '@/utils/reviewFlow'
import db from '@/db'
import { ElMessage, ElMessageBox } from 'element-plus'
import StatusTag from '@/components/common/StatusTag.vue'

const router = useRouter()
const authStore = useAuthStore()
const censusStore = useCensusStore()
const statisticsStore = useStatisticsStore()
const records = ref([])
const taskById = ref(new Map())
const activeFilter = ref('all')
const completingTaskId = ref(null)

const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '待填报', value: 'pending' },
  { label: '填报中', value: 'in_progress' },
  { label: '已提交', value: 'submitted' },
]

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const todoCount = computed(() => censusStore.assignments.filter(a => a.status === 'pending').length)
const inProgressCount = computed(() => censusStore.assignments.filter(a => ['in_progress', 'submitted'].includes(a.status)).length)
const completedCount = computed(() => censusStore.assignments.filter(a => a.status === 'reviewed').length)
const totalAssignments = computed(() => censusStore.assignments.length)
const completedAssignments = computed(() => censusStore.assignments.filter(a => ['submitted', 'reviewed', 'completed'].includes(a.status) || Number(a.progress) >= 100).length)
const executionProgress = computed(() => totalAssignments.value ? Math.round(censusStore.assignments.reduce((sum, item) => sum + Number(item.progress || 0), 0) / totalAssignments.value) : 0)
const totalRecords = computed(() => records.value.length)
const reviewedRecords = computed(() => records.value.filter(record => ['available', 'approved'].includes(record.status)).length)
const reviewProgress = computed(() => totalRecords.value ? Math.round(reviewedRecords.value / totalRecords.value * 100) : 0)

const groupedTasks = computed(() => {
  const grouped = new Map()
  censusStore.assignments.forEach(item => {
    const task = taskById.value.get(item.taskId) || {}
    const key = item.taskId
    if (!grouped.has(key)) {
      grouped.set(key, {
        taskId: item.taskId,
        taskTitle: task.title || item.areaName || '子任务',
        taskStatus: task.status,
        deadline: task.deadline,
        assignedToName: item.assignedToName,
        areaNames: [],
        statuses: [],
        progressTotal: 0,
        assignmentCount: 0,
        unitCount: 0,
        spotCheckCount: 0,
        importedCheckCount: 0,
      })
    }
    const current = grouped.get(key)
    current.areaNames.push(item.areaName || item.areaCode)
    current.statuses.push(item.status)
    current.progressTotal += Number(item.progress || 0)
    current.assignmentCount += 1
    current.unitCount += Number(item.unitCount || 0)
    current.spotCheckCount += Number(item.spotCheckCount || 0)
    current.importedCheckCount += Number(item.importedCheckCount || 0)
  })
  return Array.from(grouped.values()).map(item => {
    const uniqueAreas = [...new Set(item.areaNames)]
    const progress = item.assignmentCount ? Math.round(item.progressTotal / item.assignmentCount) : 0
    return {
      ...item,
      areaSummary: uniqueAreas.length > 1 ? `${uniqueAreas.slice(0, 2).join('、')}等${uniqueAreas.length}个区域` : (uniqueAreas[0] || '未分配区域'),
      progress,
      displayStatus: deriveTaskStatus(item.statuses, progress),
    }
  })
})

const filteredTasks = computed(() => {
  if (activeFilter.value === 'all') return groupedTasks.value
  return groupedTasks.value.filter(item => item.displayStatus === activeFilter.value)
})

onMounted(async () => {
  await censusStore.fetchMyAssignments()
  await statisticsStore.fetchDashboardData()
  const tasks = await db.censusTasks.toArray()
  taskById.value = new Map(tasks.map(task => [task.id, task]))
  await loadRecords()
})

async function loadRecords() {
  const assignmentIds = censusStore.assignments.map(item => item.id)
  const list = []
  for (const assignmentId of assignmentIds) {
    list.push(...await db.censusRecords.where('assignmentId').equals(assignmentId).toArray())
  }
  records.value = list
}

function deriveTaskStatus(statuses = [], progress = 0) {
  if (!statuses.length) return 'pending'
  if (statuses.every(status => status === 'submitted')) return 'submitted'
  if (statuses.some(status => status === 'submitted') || progress >= 100) return 'submitted'
  if (statuses.some(status => status === 'in_progress') || progress > 0) return 'in_progress'
  return 'pending'
}

function openTask(item) {
  router.push(`/m/tasks/${item.taskId}`)
}

async function handleCompleteTask(item) {
  completingTaskId.value = item.taskId
  try {
    const check = await validateImportedCheckCompleted(item.taskId)
    if (!check.ok) {
      ElMessage.warning('任务还有核查任务未完成')
      return
    }
    await ElMessageBox.confirm(`确定结束子任务「${item.taskTitle}」吗？`, '结束任务', { type: 'warning' })
    const assignments = await db.censusAssignments.where('taskId').equals(Number(item.taskId)).toArray()
    const now = new Date().toISOString()
    for (const assignment of assignments) {
      await db.censusAssignments.update(assignment.id, {
        status: 'submitted',
        progress: 100,
        submittedAt: assignment.submittedAt || now,
        updatedAt: now,
      })
    }
    await censusStore.completeTask(item.taskId)
    await censusStore.fetchMyAssignments()
    const tasks = await db.censusTasks.toArray()
    taskById.value = new Map(tasks.map(task => [task.id, task]))
    ElMessage.success('子任务已结束')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '结束任务失败')
    }
  } finally {
    completingTaskId.value = null
  }
}

async function validateImportedCheckCompleted(taskId) {
  const assignments = await db.censusAssignments.where('taskId').equals(Number(taskId)).toArray()
  const requiredUnits = []
  for (const assignment of assignments) {
    const ids = parseArray(assignment.targetAccommodationIds).map(Number).filter(Boolean)
    for (const id of ids) {
      const unit = await db.accommodations.get(id)
      if (unit?.checkType === 'imported_catalog') requiredUnits.push(unit)
    }
  }
  if (!requiredUnits.length) return { ok: true }

  const taskRecords = []
  for (const assignment of assignments) {
    taskRecords.push(...await db.censusRecords.where('assignmentId').equals(Number(assignment.id)).toArray())
  }
  taskRecords.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
  const recordByUnit = new Map()
  const recordByCreditCode = new Map()
  taskRecords.forEach(record => {
    if (record.accommodationId && !recordByUnit.has(Number(record.accommodationId))) recordByUnit.set(Number(record.accommodationId), record)
    if (record.creditCode && !recordByCreditCode.has(record.creditCode)) recordByCreditCode.set(record.creditCode, record)
  })
  const unfinished = requiredUnits.filter(unit => {
    const record = recordByUnit.get(Number(unit.id)) || recordByCreditCode.get(unit.creditCode)
    return !isImportedRecordCompleted(record)
  })
  return { ok: unfinished.length === 0 }
}

function isImportedRecordCompleted(record) {
  if (!record) return false
  return ['pending_county_review', 'pending_city_review', 'pending_province_review', 'available'].includes(normalizeRecordStatus(record.status))
}

function parseArray(raw) {
  try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
}
</script>

<style lang="scss" scoped>
.stat-item {
  text-align: center;

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}

.progress-card {
  .progress-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    margin-bottom: 8px;

    &.review {
      margin-top: 16px;
    }

    strong {
      color: #1a5fc5;
      font-size: 18px;
    }
  }

  .progress-title {
    font-size: 15px;
    font-weight: 700;
    color: #1f2937;
  }

  .progress-sub {
    margin-top: 3px;
    font-size: 12px;
    color: #909399;
  }
}

.task-section {
  padding: 0 12px 16px;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 14px 2px 8px;

  h3 {
    margin: 2px 0 0;
    font-size: 18px;
    color: #1f2937;
  }

  span {
    font-size: 13px;
    color: #606266;
  }
}

.section-kicker {
  font-size: 12px;
  font-weight: 700;
  color: #1a5fc5;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0 8px;
}

.filter-chip {
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid #e0e6ef;
  color: #606266;
  background: #fff;
  font-size: 12px;
  white-space: nowrap;

  &.active {
    background: #1a5fc5;
    color: #fff;
    border-color: #1a5fc5;
  }
}

.empty-state {
  text-align: center;
  color: #909399;
  padding: 32px 0;
}

.assignment-card {
  margin: 8px 0;
  padding: 14px;
  border: 1px solid #eef0f4;
}

.card-head,
.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.task-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.task-meta,
.card-foot {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 12px 0;

  div {
    padding: 9px;
    border-radius: 10px;
    background: #f8fafc;
    text-align: center;
  }

  strong {
    display: block;
    font-size: 18px;
    color: #1f2937;
  }

  span {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: #909399;
  }
}
</style>
