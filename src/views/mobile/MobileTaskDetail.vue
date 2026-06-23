<template>
  <div style="padding-bottom: 16px;" v-loading="loading">
    <template v-if="task">
      <!-- 任务信息卡 -->
      <div class="m-card" style="border-radius: 0 0 16px 16px; margin-top: 0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h3 style="margin: 0; font-size: 17px; flex: 1;">{{ task.title }}</h3>
          <StatusTag :value="task.status" :options="CENSUS_TASK_STATUS_OPTIONS" style="flex-shrink: 0;" />
        </div>
        <p style="color: #909399; font-size: 13px; margin-top: 8px; line-height: 1.5;">{{ task.description }}</p>
        <div style="display: flex; gap: 16px; margin-top: 12px; font-size: 13px; color: #909399;">
          <span><el-icon><Calendar /></el-icon> 截止：{{ formatDate(task.deadline) }}</span>
        </div>
      </div>

      <!-- 分配区域列表 -->
      <div class="m-card">
        <div style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">
          填报区域（{{ censusStore.assignments.length }}个）
        </div>

        <div v-for="assignment in censusStore.assignments" :key="assignment.id"
          class="assignment-item" @click="handleStartEntry(assignment)">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 15px; font-weight: 500;">{{ assignment.areaName || assignment.areaCode }}</div>
              <div style="font-size: 12px; color: #909399; margin-top: 4px;">
                {{ assignment.assignedToName || '待分配' }}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-progress type="circle" :percentage="assignment.progress" :width="40"
                :stroke-width="4" :color="assignment.progress === 100 ? '#67c23a' : '#1a5fc5'" />
              <el-icon color="#c0c4cc"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>

        <div v-if="censusStore.assignments.length === 0" style="text-align: center; color: #909399; padding: 20px;">
          暂无分配区域
        </div>
      </div>

      <!-- 已填单位清单 -->
      <div class="m-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 15px; font-weight: 600;">已填单位清单</span>
          <el-button link type="primary" size="small" @click="loadRecords">刷新</el-button>
        </div>
        <div v-if="records.length === 0" style="text-align: center; color: #909399; padding: 18px 0;">
          暂无草稿或提交记录
        </div>
        <div v-for="record in records" :key="record.id" class="record-item">
          <div style="display: flex; justify-content: space-between; gap: 10px;">
            <div style="min-width: 0; flex: 1;">
              <div class="record-title">{{ record.unitName || '未命名单位' }}</div>
              <div class="record-meta">{{ record.creditCode || '无信用代码' }} · {{ recordAssignmentName(record.assignmentId) }}</div>
              <div class="record-meta">更新：{{ formatDateTime(record.updatedAt || record.createdAt) }}</div>
            </div>
            <StatusTag :value="record.status" :options="CENSUS_RECORD_STATUS_OPTIONS" style="flex-shrink: 0;" />
          </div>
          <div class="record-actions">
            <el-button v-if="canEditRecord(record)" link type="primary" size="small" @click.stop="editRecord(record)">修改</el-button>
            <el-button v-if="record.status === 'draft'" link type="success" size="small" @click.stop="submitRecord(record)">提交审核</el-button>
            <el-button v-if="canEditRecord(record)" link type="danger" size="small" @click.stop="deleteRecord(record)">删除</el-button>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div v-if="['published', 'in_progress'].includes(task.status)" style="padding: 0 12px;">
        <el-button type="primary" class="m-btn" style="width: 100%;" @click="handleStartEntry(censusStore.assignments[0])">
          开始填报
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCensusStore } from '@/stores/census'
import { CENSUS_RECORD_STATUS_OPTIONS, CENSUS_TASK_STATUS_OPTIONS } from '@/utils/constants'
import { formatDate, formatDateTime } from '@/utils/formatters'
import StatusTag from '@/components/common/StatusTag.vue'
import db from '@/db'
import { submitForCountyReviewPatch } from '@/utils/reviewFlow'

const route = useRoute()
const router = useRouter()
const censusStore = useCensusStore()

const task = ref(null)
const loading = ref(true)
const records = ref([])

onMounted(async () => {
  await censusStore.fetchTaskDetail(route.params.id)
  task.value = censusStore.currentTask
  await loadRecords()
  loading.value = false
})

function handleStartEntry(assignment) {
  if (!assignment) return
  router.push(`/m/entry/${route.params.id}/${assignment.id}`)
}

async function loadRecords() {
  const assignmentIds = censusStore.assignments.map(item => item.id)
  if (!assignmentIds.length) {
    records.value = []
    return
  }
  const all = []
  for (const assignmentId of assignmentIds) {
    all.push(...await db.censusRecords.where('assignmentId').equals(assignmentId).toArray())
  }
  records.value = all.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
}

function recordAssignmentName(assignmentId) {
  const assignment = censusStore.assignments.find(item => item.id === assignmentId)
  return assignment?.areaName || assignment?.areaCode || '未关联区域'
}

function editRecord(record) {
  router.push(`/m/entry/${route.params.id}/${record.assignmentId}?recordId=${record.id}`)
}

async function submitRecord(record) {
  await db.censusRecords.update(record.id, submitForCountyReviewPatch())
  ElMessage.success('已提交审核')
  await loadRecords()
}

function canEditRecord(record) {
  return ['draft', 'county_rejected'].includes(record.status)
}

async function deleteRecord(record) {
  try {
    await ElMessageBox.confirm(`确定删除「${record.unitName || '未命名单位'}」的填报记录吗？`, '删除确认', { type: 'warning' })
    await db.censusRecords.delete(record.id)
    ElMessage.success('已删除')
    await loadRecords()
  } catch { /* cancel */ }
}
</script>

<style lang="scss" scoped>
.assignment-item {
  padding: 14px 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child { border-bottom: none; }
  &:active { background: #fafafa; }
}

.record-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.record-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.record-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
