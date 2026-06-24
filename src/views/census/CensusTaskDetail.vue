<template>
  <div class="page-container" v-loading="store.taskLoading">
    <el-page-header @back="router.push(backPath)" :title="'返回'">
      <template #content>
        <span class="page-title">{{ store.currentTask?.title || '任务详情' }}</span>
        <StatusTag v-if="store.currentTask" :value="store.currentTask.status" :options="CENSUS_TASK_STATUS_OPTIONS" style="margin-left: 8px" />
      </template>
    </el-page-header>

    <div v-if="store.currentTask" style="margin-top: 20px;">
      <el-card shadow="never" style="margin-bottom: 16px;">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务类型">{{ isMainTask ? '主任务' : '子任务' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <StatusTag :value="store.currentTask.status" :options="CENSUS_TASK_STATUS_OPTIONS" />
          </el-descriptions-item>
          <el-descriptions-item label="任务名称">{{ store.currentTask.title }}</el-descriptions-item>
          <el-descriptions-item label="开始日期">{{ formatDate(store.currentTask.startDate) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="截止日期">{{ formatDate(store.currentTask.deadline) }}</el-descriptions-item>
          <el-descriptions-item label="任务描述" :span="2">{{ store.currentTask.description }}</el-descriptions-item>
          <el-descriptions-item v-if="isMainTask" label="任务范围" :span="2">
            {{ store.currentTask.scopeType === 'province' ? '贵州省全省' : areaNames(scopeCodes) }}
          </el-descriptions-item>
          <el-descriptions-item v-else label="责任人" :span="2">
            {{ store.currentTask.responsibleUserNames || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <template v-if="isMainTask">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>子任务</span>
              <el-button type="primary" @click="openSubTaskDialog" v-if="authStore.hasPermission('census:create')">创建子任务</el-button>
            </div>
          </template>
          <el-table :data="store.subTasks" border stripe>
            <el-table-column prop="title" label="子任务名称" min-width="200" show-overflow-tooltip />
            <el-table-column label="分配区域" width="110" align="center">
              <template #default="{ row }">{{ countyCountByTask(row) }}个</template>
            </el-table-column>
            <el-table-column label="总任务数" width="100" align="center">
              <template #default="{ row }">{{ subTaskStats(row.id).unitCount }}</template>
            </el-table-column>
            <el-table-column label="抽查任务数" width="110" align="center">
              <template #default="{ row }">{{ subTaskStats(row.id).spotCheckCount }}</template>
            </el-table-column>
            <el-table-column label="核查任务数" width="110" align="center">
              <template #default="{ row }">{{ subTaskStats(row.id).importedCheckCount }}</template>
            </el-table-column>
            <el-table-column prop="responsibleUserNames" label="责任人" min-width="180" show-overflow-tooltip />
            <el-table-column prop="cityAdminNames" label="市级管理员" min-width="150" show-overflow-tooltip />
            <el-table-column prop="countyAdminNames" label="县级管理员" min-width="150" show-overflow-tooltip />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }"><StatusTag :value="row.status" :options="CENSUS_TASK_STATUS_OPTIONS" /></template>
            </el-table-column>
            <el-table-column label="截止日期" width="120" align="center">
              <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="240" align="center">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="router.push(`/census/${row.id}`)">查看</el-button>
                <el-button link type="primary" size="small" @click="openEditSubTaskDialog(row)" v-if="authStore.hasPermission('census:update')">编辑</el-button>
                <el-button link type="primary" size="small" @click="openTaskUnits(row)">单位详情</el-button>
                <el-button link type="success" size="small" @click="store.startTask(row.id); refresh()" v-if="row.status === 'published' && authStore.hasPermission('census:update')">启动</el-button>
                <el-button link type="danger" size="small" @click="removeSubTask(row)" v-if="row.status !== 'in_progress' && authStore.hasPermission('census:delete')">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>

      <template v-else>
        <el-card header="分配与进度" shadow="never">
          <ProgressOverview :assignments="store.assignments" />
        </el-card>

        <el-card header="任务单位名单" shadow="never" style="margin-top: 16px;">
          <el-table :data="taskUnits" border stripe size="small">
            <el-table-column prop="name" label="单位名称" min-width="180" show-overflow-tooltip />
            <el-table-column label="市州" width="120" align="center">
              <template #default="{ row }">{{ areaStore.getAreaName(row.cityCode) || '-' }}</template>
            </el-table-column>
            <el-table-column label="区县" width="120" align="center">
              <template #default="{ row }">{{ areaStore.getAreaName(row.countyCode) || '-' }}</template>
            </el-table-column>
            <el-table-column prop="detailAddress" label="地址" min-width="240" show-overflow-tooltip />
            <el-table-column label="核查类型" width="130" align="center">
              <template #default="{ row }">{{ getOptionLabel('checkType', row.checkType) || '-' }}</template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card header="采集记录" shadow="never" style="margin-top: 16px;">
          <template #header>
            <div class="card-header">
              <span>采集记录</span>
              <div>
                <el-button size="small" @click="loadRecords">刷新</el-button>
                <el-button size="small" type="primary" :disabled="records.length === 0" @click="exportRecords">导出 CSV</el-button>
              </div>
            </div>
          </template>

          <el-table :data="records" border stripe size="small">
            <el-table-column prop="unitName" label="单位名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="creditCode" label="信用代码" min-width="170" show-overflow-tooltip />
            <el-table-column label="来源" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="row.source === 'mobile' ? 'success' : 'info'">{{ row.source === 'mobile' ? '移动端' : 'PC端' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }"><StatusTag :value="row.status" :options="CENSUS_RECORD_STATUS_OPTIONS" /></template>
            </el-table-column>
            <el-table-column label="提交时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.submittedAt || row.updatedAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" align="center">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openRecord(row)">查看</el-button>
                <el-button link type="primary" size="small" @click="editRecord(row)">修改</el-button>
                <el-button v-if="row.status === 'draft'" link type="success" size="small" @click="submitRecordForReview(row)">提交审核</el-button>
                <el-button v-if="canCurrentUserReview(row)" link type="success" size="small" @click="reviewRecord(row, 'approve')">{{ currentReviewStep?.approveText || '通过' }}</el-button>
                <el-button v-if="canCurrentUserReview(row)" link type="danger" size="small" @click="reviewRecord(row, 'reject')">{{ currentReviewStep?.rejectText || '驳回' }}</el-button>
                <el-button link type="danger" size="small" @click="deleteRecord(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <div style="margin-top: 20px; text-align: right;">
          <el-button v-if="['published', 'in_progress'].includes(store.currentTask.status) && authStore.hasPermission('census:fill')"
            type="primary" @click="router.push(`/census/${store.currentTask.id}/entry`)">数据填报</el-button>
        </div>
      </template>
    </div>

    <el-dialog v-model="subTaskDialogVisible" :title="editingSubTaskId ? '编辑子任务' : '创建子任务'" width="760px" @closed="handleSubTaskDialogClosed">
      <el-form ref="subTaskFormRef" :model="subTaskForm" :rules="subTaskRules" label-width="110px">
        <el-form-item label="子任务名称" prop="title">
          <el-input v-model="subTaskForm.title" placeholder="请输入子任务名称" />
        </el-form-item>
        <el-form-item label="截止日期" prop="deadline">
          <el-date-picker v-model="subTaskForm.deadline" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="任务说明">
          <el-input v-model="subTaskForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="分配区域" prop="assignedAreaCodes">
          <AreaAssignTree v-model="subTaskForm.assignedAreaCodes" />
        </el-form-item>
        <el-form-item label="普查人员" prop="responsibleUserIds">
          <el-select
            v-model="subTaskForm.responsibleUserIds"
            multiple
            filterable
            placeholder="输入姓名、用户名或手机号搜索普查人员"
            style="width: 100%"
          >
            <el-option
              v-for="user in enumeratorUsers"
              :key="user.id"
              :label="`${user.realName}（${user.username} · ${user.areaName}）`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="市级管理员" prop="cityAdminIds">
          <el-select
            v-model="subTaskForm.cityAdminIds"
            multiple
            filterable
            placeholder="指定市级管理员"
            style="width: 100%"
          >
            <el-option
              v-for="user in cityAdminUsers"
              :key="user.id"
              :label="`${user.realName}（${user.username} · ${user.areaName}）`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="县级管理员" prop="countyAdminIds">
          <el-select
            v-model="subTaskForm.countyAdminIds"
            multiple
            filterable
            placeholder="指定县级管理员"
            style="width: 100%"
          >
            <el-option
              v-for="user in countyAdminUsers"
              :key="user.id"
              :label="`${user.realName}（${user.username} · ${user.areaName}）`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="subTaskDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submittingSubTask" @click="submitSubTask">{{ editingSubTaskId ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="recordDrawerVisible" title="采集记录详情" size="620px">
      <div v-if="activeRecord">
        <el-descriptions :column="2" border style="margin-bottom: 16px;">
          <el-descriptions-item label="单位名称" :span="2">{{ activeRecord.unitName }}</el-descriptions-item>
          <el-descriptions-item label="信用代码">{{ activeRecord.creditCode }}</el-descriptions-item>
          <el-descriptions-item label="状态"><StatusTag :value="activeRecord.status" :options="CENSUS_RECORD_STATUS_OPTIONS" /></el-descriptions-item>
          <el-descriptions-item label="提交来源">{{ activeRecord.source === 'mobile' ? '移动端' : 'PC端' }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDateTime(activeRecord.submittedAt || activeRecord.updatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="县级审核">{{ formatDateTime(activeRecord.countyReviewedAt || activeRecord.countyRejectedAt) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="市级审核">{{ formatDateTime(activeRecord.cityReviewedAt || activeRecord.cityRejectedAt) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="省级审核">{{ formatDateTime(activeRecord.provinceReviewedAt || activeRecord.provinceRejectedAt) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="是否可用">{{ activeRecord.status === 'available' || activeRecord.status === 'approved' ? '是' : '否' }}</el-descriptions-item>
        </el-descriptions>

        <div v-for="group in previewGroups" :key="group.module.key" class="record-section">
          <h3>{{ group.module.key }} {{ group.module.title }}</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item v-for="item in group.items" :key="item.key" :label="item.field.label">
              <img v-if="item.field.type === 'signature' && item.value" class="signature-image" :src="item.value" alt="住宿单位负责人签字" />
              <span v-else>{{ formatFieldValue(item.key, item.field, item.value) || '-' }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="unitDrawerVisible" title="任务单位详情" size="760px">
      <el-table :data="pagedUnitDrawerRows" border stripe>
        <el-table-column label="序号" width="70" align="center">
          <template #default="{ $index }">{{ ($index + 1) + (unitDrawerPagination.page - 1) * unitDrawerPagination.pageSize }}</template>
        </el-table-column>
        <el-table-column prop="name" label="单位名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="市州" width="120" align="center">
          <template #default="{ row }">{{ areaStore.getAreaName(row.cityCode) || '-' }}</template>
        </el-table-column>
        <el-table-column label="区县" width="120" align="center">
          <template #default="{ row }">{{ areaStore.getAreaName(row.countyCode) || '-' }}</template>
        </el-table-column>
        <el-table-column prop="detailAddress" label="地址" min-width="240" show-overflow-tooltip />
        <el-table-column label="核查类型" width="130" align="center">
          <template #default="{ row }">{{ getOptionLabel('checkType', row.checkType) || '-' }}</template>
        </el-table-column>
      </el-table>
      <div class="drawer-pagination" v-if="unitDrawerPagination.total > 0">
        <el-pagination
          v-model:current-page="unitDrawerPagination.page"
          v-model:page-size="unitDrawerPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="unitDrawerPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handleUnitDrawerPageChange"
          @size-change="handleUnitDrawerSizeChange"
        />
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCensusStore } from '@/stores/census'
import { useAuthStore } from '@/stores/auth'
import { useAreaStore } from '@/stores/area'
import { CENSUS_RECORD_STATUS_OPTIONS, CENSUS_TASK_STATUS_OPTIONS } from '@/utils/constants'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { COLLECTION_FIELD_MAP, COLLECTION_MODULES, getOptionLabel, getVisibleModuleFields, shouldSkipBusinessModule } from '@/utils/collectionSpec'
import { buildReviewPatch, canReviewRecord, getReviewStepForRole, isReviewerInScope, submitForCountyReviewPatch } from '@/utils/reviewFlow'
import { archiveCensusRecord, publishRecordToAccommodation } from '@/utils/accommodationWorkflow'
import db from '@/db'
import { ElMessage, ElMessageBox } from 'element-plus'
import StatusTag from '@/components/common/StatusTag.vue'
import ProgressOverview from '@/components/census/ProgressOverview.vue'
import AreaAssignTree from '@/components/census/AreaAssignTree.vue'

const route = useRoute()
const router = useRouter()
const store = useCensusStore()
const authStore = useAuthStore()
const areaStore = useAreaStore()
const records = ref([])
const activeRecord = ref(null)
const recordDrawerVisible = ref(false)
const unitDrawerVisible = ref(false)
const unitDrawerRows = ref([])
const unitDrawerPagination = reactive({ page: 1, pageSize: 10, total: 0 })
const taskUnits = ref([])
const subTaskDialogVisible = ref(false)
const submittingSubTask = ref(false)
const editingSubTaskId = ref(null)
const subTaskFormRef = ref(null)
const enumeratorUsers = ref([])
const cityAdminUsers = ref([])
const countyAdminUsers = ref([])

const subTaskForm = reactive({
  title: '',
  deadline: '',
  description: '',
  assignedAreaCodes: [],
  responsibleUserIds: [],
  cityAdminIds: [],
  countyAdminIds: [],
})

const subTaskRules = {
  title: [{ required: true, message: '请输入子任务名称', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择截止日期', trigger: 'change' }],
  assignedAreaCodes: [{ required: true, type: 'array', min: 1, message: '请选择分配区域', trigger: 'change' }],
  responsibleUserIds: [{ required: true, type: 'array', min: 1, message: '请选择普查人员', trigger: 'change' }],
  cityAdminIds: [{ required: true, type: 'array', min: 1, message: '请选择市级管理员', trigger: 'change' }],
  countyAdminIds: [{ required: true, type: 'array', min: 1, message: '请选择县级管理员', trigger: 'change' }],
}

const isMainTask = computed(() => (store.currentTask?.taskType || 'main') === 'main')
const backPath = computed(() => isMainTask.value ? '/census' : `/census/${store.currentTask?.parentTaskId || ''}`)
const scopeCodes = computed(() => parseArray(store.currentTask?.scopeAreaCodes || store.currentTask?.assignedAreaCodes))
const currentReviewStep = computed(() => getReviewStepForRole(authStore.userRole))

const activeForm = computed(() => {
  if (!activeRecord.value?.formData) return {}
  try { return JSON.parse(activeRecord.value.formData) } catch { return {} }
})

const previewGroups = computed(() => COLLECTION_MODULES.filter(m => m.key !== 'PREVIEW').map(module => {
  const fieldKeys = module.key === 'B' && shouldSkipBusinessModule(activeForm.value) ? [] : getVisibleModuleFields(module, activeForm.value)
  return {
    module,
    items: fieldKeys.map(key => ({ key, field: COLLECTION_FIELD_MAP[key], value: activeForm.value[key] })).filter(item => item.field),
  }
}).filter(group => group.items.length > 0))

onMounted(refresh)
watch(() => route.params.id, () => {
  recordDrawerVisible.value = false
  unitDrawerVisible.value = false
  activeRecord.value = null
  unitDrawerRows.value = []
  refresh()
})

const pagedUnitDrawerRows = computed(() => {
  const start = (unitDrawerPagination.page - 1) * unitDrawerPagination.pageSize
  return unitDrawerRows.value.slice(start, start + unitDrawerPagination.pageSize)
})

async function refresh() {
  await areaStore.fetchAreas()
  await store.fetchTaskDetail(route.params.id)
  await loadUsers()
  if (!isMainTask.value) {
    await loadRecords()
    await loadTaskUnits()
  }
}

async function loadUsers() {
  const activeUsers = (await db.users.toArray()).filter(user => user.status === 'active')
  enumeratorUsers.value = activeUsers.filter(user => user.role === 'enumerator')
  cityAdminUsers.value = activeUsers.filter(user => user.role === 'city_admin')
  countyAdminUsers.value = activeUsers.filter(user => user.role === 'county_admin')
}

function openSubTaskDialog() {
  editingSubTaskId.value = null
  subTaskForm.title = `${store.currentTask.title}子任务`
  subTaskForm.deadline = store.currentTask.deadline?.split('T')[0] || ''
  subTaskForm.description = ''
  subTaskForm.assignedAreaCodes = []
  subTaskForm.responsibleUserIds = []
  subTaskForm.cityAdminIds = []
  subTaskForm.countyAdminIds = []
  subTaskDialogVisible.value = true
}

function openEditSubTaskDialog(task) {
  editingSubTaskId.value = task.id
  subTaskForm.title = task.title || ''
  subTaskForm.deadline = task.deadline?.split('T')[0] || ''
  subTaskForm.description = task.description || ''
  subTaskForm.assignedAreaCodes = parseArray(task.assignedAreaCodes)
  subTaskForm.responsibleUserIds = parseArray(task.responsibleUserIds)
  subTaskForm.cityAdminIds = parseArray(task.cityAdminIds)
  subTaskForm.countyAdminIds = parseArray(task.countyAdminIds)
  subTaskDialogVisible.value = true
}

async function submitSubTask() {
  const valid = await subTaskFormRef.value?.validate().catch(() => false)
  if (!valid) return
  submittingSubTask.value = true
  try {
    const selectedUsers = enumeratorUsers.value.filter(user => subTaskForm.responsibleUserIds.includes(user.id))
    const selectedCityAdmins = cityAdminUsers.value.filter(user => subTaskForm.cityAdminIds.includes(user.id))
    const selectedCountyAdmins = countyAdminUsers.value.filter(user => subTaskForm.countyAdminIds.includes(user.id))
    const payload = {
      title: subTaskForm.title,
      description: subTaskForm.description,
      deadline: subTaskForm.deadline,
      assignedAreaCodes: JSON.stringify(subTaskForm.assignedAreaCodes),
      responsibleUserIds: JSON.stringify(subTaskForm.responsibleUserIds),
      responsibleUserNames: selectedUsers.map(user => user.realName).join('、'),
      cityAdminIds: JSON.stringify(subTaskForm.cityAdminIds),
      cityAdminNames: selectedCityAdmins.map(user => user.realName).join('、'),
      countyAdminIds: JSON.stringify(subTaskForm.countyAdminIds),
      countyAdminNames: selectedCountyAdmins.map(user => user.realName).join('、'),
    }
    if (editingSubTaskId.value) {
      await store.updateSubTask(editingSubTaskId.value, payload)
      ElMessage.success('子任务已更新')
    } else {
      await store.createSubTask(store.currentTask.id, payload)
      ElMessage.success('子任务已创建')
    }
    subTaskDialogVisible.value = false
    editingSubTaskId.value = null
    await refresh()
  } finally {
    submittingSubTask.value = false
  }
}

async function removeSubTask(task) {
  try {
    await ElMessageBox.confirm(`确定删除子任务「${task.title}」吗？删除后不可恢复。`, '确认删除', { type: 'warning' })
    await store.removeSubTask(task.id)
    ElMessage.success('子任务已删除')
    await refresh()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

function handleSubTaskDialogClosed() {
  editingSubTaskId.value = null
}

async function loadRecords() {
  const taskId = Number(route.params.id)
  const byTask = await db.censusRecords.where('taskId').equals(taskId).toArray()
  const byAssignments = []
  for (const assignment of store.assignments) {
    byAssignments.push(...await db.censusRecords.where('assignmentId').equals(assignment.id).toArray())
  }
  const map = new Map()
  ;[...byTask, ...byAssignments].forEach(record => map.set(record.id, record))
  records.value = Array.from(map.values())
  records.value.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
}

async function loadTaskUnits() {
  const ids = new Set()
  store.assignments.forEach(assignment => {
    parseArray(assignment.targetAccommodationIds).forEach(id => ids.add(Number(id)))
  })
  const units = []
  for (const id of ids) {
    const unit = await db.accommodations.get(id)
    if (unit) units.push(unit)
  }
  taskUnits.value = units
}

function subTaskStats(taskId) {
  const list = store.assignments.filter(item => item.taskId === taskId)
  return list.reduce((acc, item) => {
    acc.unitCount += Number(item.unitCount || 0)
    acc.spotCheckCount += Number(item.spotCheckCount || 0)
    acc.importedCheckCount += Number(item.importedCheckCount || 0)
    return acc
  }, { unitCount: 0, spotCheckCount: 0, importedCheckCount: 0 })
}

function countyCountByTask(task) {
  return expandAssignedCountyCodes(parseArray(task.assignedAreaCodes)).length
}

async function openTaskUnits(task) {
  const assignments = await db.censusAssignments.where('taskId').equals(Number(task.id)).toArray()
  const ids = new Set()
  assignments.forEach(assignment => parseArray(assignment.targetAccommodationIds).forEach(id => ids.add(Number(id))))
  const units = []
  for (const id of ids) {
    const unit = await db.accommodations.get(id)
    if (unit) units.push(unit)
  }
  unitDrawerRows.value = units
  unitDrawerPagination.page = 1
  unitDrawerPagination.total = units.length
  unitDrawerVisible.value = true
}

function handleUnitDrawerPageChange(page) {
  unitDrawerPagination.page = page
}

function handleUnitDrawerSizeChange(pageSize) {
  unitDrawerPagination.page = 1
  unitDrawerPagination.pageSize = pageSize
}

function openRecord(row) {
  activeRecord.value = row
  recordDrawerVisible.value = true
}

function editRecord(row) {
  router.push(`/census/${store.currentTask.id}/entry?assignmentId=${row.assignmentId || ''}&recordId=${row.id}`)
}

async function submitRecordForReview(row) {
  const patch = submitForCountyReviewPatch()
  await db.censusRecords.update(row.id, patch)
  Object.assign(row, patch)
  ElMessage.success('已提交审核')
}

async function deleteRecord(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.unitName || '未命名单位'}」的采集记录吗？`, '删除确认', { type: 'warning' })
    await archiveCensusRecord(row.id, '任务采集记录删除')
    ElMessage.success('已删除，可在删除管理中恢复')
    await loadRecords()
  } catch { /* cancel */ }
}

function canCurrentUserReview(row) {
  return authStore.hasPermission('census:review') && canReviewRecord(row, authStore.userRole) && isRecordInReviewScope(row)
}

function isRecordInReviewScope(row) {
  const assignment = store.assignments.find(item => item.id === row.assignmentId)
  return isReviewerInScope(assignment, authStore.userRole, authStore.currentUser?.id, authStore.userAreaCode)
}

async function reviewRecord(row, action) {
  try {
    const patch = buildReviewPatch(row, authStore.userRole, action, authStore.currentUser?.id)
    await db.censusRecords.update(row.id, patch)
    Object.assign(row, patch)
    if (patch.status === 'available') await publishRecordToAccommodation(row)
    ElMessage.success(action === 'approve' ? (patch.status === 'available' ? '省级审核通过，记录已可用' : '已提交下一级审核') : '已驳回')
  } catch (error) {
    ElMessage.error(error.message || '审核失败')
  }
}

function parseArray(raw) {
  try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
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

function areaNames(codes) {
  if (!codes?.length) return '-'
  return codes.map(code => storeAreaName(code)).join('、')
}

function storeAreaName(code) {
  return areaStore.getAreaName(code)
}

function formatFieldValue(key, field, value) {
  if (key === 'location' && value) return activeForm.value.locationAddress || '移动端已采集定位，经纬度已存储'
  if (field.type === 'photo') return value ? (activeForm.value.businessLicensePhotoName || '已上传图片') : ''
  if (field.type === 'signature') return value ? '已签字' : ''
  if (field.type === 'photos') return Array.isArray(value) && value.length ? value.map((photo, index) => photo.name || `现场照片${index + 1}.jpg`).join('、') : ''
  if (['select', 'radio', 'checkbox'].includes(field.type)) return getOptionLabel(key, value)
  if (Array.isArray(value)) return value.join('、')
  return value
}

function exportRecords() {
  const headers = ['单位名称', '信用代码', '状态', '提交来源', '提交时间']
  const fieldKeys = COLLECTION_MODULES
    .filter(module => module.key !== 'PREVIEW')
    .flatMap(module => module.fields)
  const csvRows = [
    [...headers, ...fieldKeys.map(key => COLLECTION_FIELD_MAP[key].label)],
    ...records.value.map(record => {
      let data = {}
      try { data = JSON.parse(record.formData || '{}') } catch { data = {} }
      return [
        record.unitName || '',
        record.creditCode || '',
        record.status || '',
        record.source || '',
        record.submittedAt || record.updatedAt || '',
        ...fieldKeys.map(key => formatFieldValue(key, COLLECTION_FIELD_MAP[key], data[key]) || ''),
      ]
    }),
  ]
  const csv = csvRows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.currentTask?.title || '采集记录'}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.drawer-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
