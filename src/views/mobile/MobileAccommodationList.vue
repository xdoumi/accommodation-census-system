<template>
  <div style="padding-bottom: 16px;">
    <div style="padding: 12px 12px 0;">
      <input v-model="keyword" class="m-input" placeholder="搜索单位名称、信用代码或地址" />
    </div>
    <div class="status-filter">
      <button
        v-for="item in statusFilterOptions"
        :key="item.value"
        type="button"
        class="status-chip"
        :class="{ active: statusFilter === item.value }"
        @click="statusFilter = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <div style="padding: 0 12px; margin-top: 8px;">
      <div v-if="filteredRecords.length === 0" style="text-align: center; color: #909399; padding: 40px 0;">
        <el-icon :size="48" color="#dcdfe6"><OfficeBuilding /></el-icon>
        <p style="margin-top: 12px;">暂无填写的单位</p>
      </div>

      <div v-for="record in filteredRecords" :key="record.id" class="m-card record-card" :class="{ rejected: isRejectedRecord(record) }">
        <div class="record-head">
          <div style="min-width: 0; flex: 1;">
            <div class="record-title">{{ record.unitName || '未命名单位' }}</div>
            <div class="record-meta">{{ record.actualAddress || record.registeredAddress || record.locationAddress || '暂无地址' }}</div>
          </div>
          <StatusTag :value="record.status" :options="CENSUS_RECORD_STATUS_OPTIONS" />
        </div>
        <div v-if="isRejectedRecord(record)" class="reject-notice">
          <div>
            <strong>记录已驳回</strong>
            <span>{{ rejectReason(record) || '暂无驳回原因' }}</span>
          </div>
          <button type="button" @click="showRejectReason(record)">查看原因</button>
        </div>
        <div class="record-lines">
          <div><span>信用代码</span>{{ record.creditCode || '-' }}</div>
          <div><span>来源</span>{{ sourceText(record) }}</div>
          <div><span>核查类型</span>{{ optionLabel('checkType', record.checkType) || '-' }}</div>
          <div><span>更新</span>{{ formatDateTime(record.updatedAt || record.createdAt) }}</div>
        </div>
        <div class="record-actions">
          <el-button link type="primary" size="small" @click="viewRecord(record)">查看</el-button>
          <el-button v-if="isRejectedRecord(record)" link type="warning" size="small" @click="showRejectReason(record)">驳回原因</el-button>
          <el-button v-if="canEditRecord(record)" link type="primary" size="small" @click="editRecord(record)">编辑</el-button>
          <el-button v-if="record.status === 'draft'" link type="success" size="small" @click="submitRecord(record)">提交</el-button>
          <el-button v-if="canEditRecord(record)" link type="danger" size="small" @click="deleteRecord(record)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCensusStore } from '@/stores/census'
import db from '@/db'
import { CENSUS_RECORD_STATUS_OPTIONS } from '@/utils/constants'
import { formatDateTime } from '@/utils/formatters'
import { getOptionLabel } from '@/utils/collectionSpec'
import { normalizeRecordStatus, submitForCountyReviewPatch } from '@/utils/reviewFlow'
import { archiveCensusRecord } from '@/utils/accommodationWorkflow'
import StatusTag from '@/components/common/StatusTag.vue'

const router = useRouter()
const censusStore = useCensusStore()
const keyword = ref('')
const statusFilter = ref('all')
const records = ref([])
const statusFilterOptions = [
  { value: 'all', label: '全部状态' },
  ...CENSUS_RECORD_STATUS_OPTIONS.map(item => ({ value: item.value, label: item.label })),
]

const filteredRecords = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  let list = records.value
  if (statusFilter.value !== 'all') {
    list = list.filter(record => record.status === statusFilter.value)
  }
  if (kw) {
    list = list.filter(record => [
      record.unitName,
      record.creditCode,
      record.actualAddress,
      record.registeredAddress,
      record.locationAddress,
    ].some(value => String(value || '').toLowerCase().includes(kw)))
  }
  return list.slice(0, 100)
})

onMounted(loadRecords)

async function loadRecords() {
  await censusStore.fetchMyAssignments()
  const assignmentIds = censusStore.assignments.map(item => item.id)
  if (!assignmentIds.length) {
    records.value = []
    return
  }
  const list = []
  for (const assignmentId of assignmentIds) {
    const assignmentRecords = await db.censusRecords.where('assignmentId').equals(assignmentId).toArray()
    for (const record of assignmentRecords) {
      list.push(await decorateRecord(record))
    }
  }
  records.value = list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
}

async function decorateRecord(record) {
  let formData = {}
  try { formData = JSON.parse(record.formData || '{}') } catch { /* ignore */ }
  const task = record.taskId ? await db.censusTasks.get(record.taskId) : null
  return {
    ...record,
    ...formData,
    status: normalizeRecordStatus(record.status),
    unitName: record.unitName || formData.operatingName || formData.registeredName || formData.unitName,
    creditCode: record.creditCode || formData.creditCode,
    catalogSource: record.catalogSource || formData.catalogSource || '',
    checkType: record.checkType || formData.checkType || '',
    taskTitle: task?.title || '',
  }
}

function optionLabel(fieldKey, value) {
  return getOptionLabel(fieldKey, value)
}

function sourceText(record) {
  return optionLabel('catalogSource', record.catalogSource) || '-'
}

function canEditRecord(record) {
  return ['draft', 'county_rejected'].includes(record.status)
}

function isRejectedRecord(record) {
  return ['county_rejected', 'city_rejected', 'province_rejected'].includes(normalizeRecordStatus(record?.status))
}

function rejectReason(record) {
  return record?.rejectReason || record?.reviewComment || ''
}

function showRejectReason(record) {
  ElMessageBox.alert(rejectReason(record) || '暂无驳回原因', '驳回原因', {
    confirmButtonText: '知道了',
    type: 'warning',
  })
}

function viewRecord(record) {
  router.push(`/m/entry/${record.taskId}/${record.assignmentId}?recordId=${record.id}&mode=view`)
}

function editRecord(record) {
  router.push(`/m/entry/${record.taskId}/${record.assignmentId}?recordId=${record.id}`)
}

async function submitRecord(record) {
  await db.censusRecords.update(record.id, submitForCountyReviewPatch())
  ElMessage.success('已提交审核')
  await loadRecords()
}

async function deleteRecord(record) {
  try {
    await ElMessageBox.confirm(`确定删除「${record.unitName || '未命名单位'}」的填报记录吗？`, '删除确认', { type: 'warning' })
    await archiveCensusRecord(record.id, '移动端填写清单删除')
    ElMessage.success('已删除，可在PC端删除管理中恢复')
    await loadRecords()
  } catch { /* cancel */ }
}
</script>

<style lang="scss" scoped>
.status-filter {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 12px 2px;
}

.status-chip {
  min-height: 34px;
  padding: 0 13px;
  border: 1px solid #dfe6f0;
  border-radius: 999px;
  background: #fff;
  color: #606266;
  font-size: 12px;
  white-space: nowrap;

  &.active {
    color: #fff;
    background: #1a5fc5;
    border-color: #1a5fc5;
  }
}

.record-card {
  margin: 8px 0;
  padding: 14px;

  &.rejected {
    border-color: #f8b4b4;
    background: #fff8f8;
    box-shadow: inset 4px 0 0 #f56c6c;
  }
}

.record-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
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
  line-height: 1.4;
}

.record-lines {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin-top: 10px;
  font-size: 12px;
  color: #303133;

  span {
    display: block;
    margin-bottom: 2px;
    color: #909399;
  }
}

.reject-notice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  background: #fef0f0;
  color: #b42318;
  font-size: 12px;

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 2px;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #7a271a;
  }

  button {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: #c45656;
    font-weight: 600;
  }
}

.record-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
</style>
