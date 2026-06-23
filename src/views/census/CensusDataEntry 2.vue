<template>
  <div class="page-container">
    <el-page-header @back="router.push('/census')" :title="'返回任务列表'">
      <template #content>
        <span class="page-title">数据填报 - {{ task?.title }}</span>
      </template>
    </el-page-header>

    <div v-if="task" style="margin-top: 20px;">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        <p>任务：{{ task.title }} | 截止日期：{{ formatDate(task.deadline) }}</p>
        <p>必填字段：{{ requiredFieldLabels.join('、') }}</p>
      </el-alert>

      <!-- 选择区域分配 -->
      <el-card shadow="never" style="margin-bottom: 16px;">
        <template #header>
          <span>选择填报区域</span>
        </template>
        <el-select v-model="selectedAssignmentId" placeholder="请选择要填报的区域" style="width: 300px" @change="handleAssignmentChange">
          <el-option v-for="a in myAssignments" :key="a.id" :label="a.areaName" :value="a.id">
            <span>{{ a.areaName }}</span>
            <StatusTag :value="a.status" :options="CENSUS_ASSIGNMENT_STATUS_OPTIONS" style="margin-left: 8px;" />
          </el-option>
        </el-select>
      </el-card>

      <!-- 填报区域住宿单位 -->
      <el-card shadow="never" v-if="selectedAssignmentId">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>住宿单位填报</span>
            <el-tag>共 {{ accommodations.length }} 个单位</el-tag>
          </div>
        </template>

        <el-table :data="accommodations" stripe border size="small">
          <el-table-column prop="name" label="单位名称" min-width="160" />
          <el-table-column prop="category" label="类别" width="100" align="center">
            <template #default="{ row }"><CategoryTag :value="row.category" /></template>
          </el-table-column>
          <el-table-column label="填报状态" width="100" align="center">
            <template #default="{ row }">
              <StatusTag :value="getRecordStatus(row.id)" :options="CENSUS_RECORD_STATUS_OPTIONS" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleFill(row)">
                {{ getRecordStatus(row.id) === 'draft' || !getRecordStatus(row.id) ? '填报' : '查看' }}
              </el-button>
              <el-button link type="success" size="small" @click="handleSubmitRecord(row)"
                v-if="getRecordStatus(row.id) === 'draft'">提交</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 填报对话框 -->
    <el-dialog v-model="fillDialogVisible" title="数据填报" width="700px" destroy-on-close>
      <el-form :model="fillForm" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="12" v-for="field in requiredFields" :key="field.value">
            <el-form-item :label="field.label">
              <el-input v-if="field.type === 'input'" v-model="fillForm[field.value]" />
              <el-input-number v-else-if="field.type === 'number'" v-model="fillForm[field.value]" style="width: 100%" />
              <el-select v-else-if="field.type === 'select'" v-model="fillForm[field.value]" style="width: 100%">
                <el-option v-for="opt in field.options || []" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="fillDialogVisible = false">取消</el-button>
        <el-button type="info" @click="handleSaveDraft">保存草稿</el-button>
        <el-button type="primary" @click="handleSubmitFill">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCensusStore } from '@/stores/census'
import { useAuthStore } from '@/stores/auth'
import db from '@/db'
import { ElMessage } from 'element-plus'
import { CENSUS_ASSIGNMENT_STATUS_OPTIONS, CENSUS_RECORD_STATUS_OPTIONS, CATEGORY_OPTIONS, OPERATING_STATUS_OPTIONS, LICENSE_STATUS_OPTIONS, FIRE_INSPECTION_OPTIONS, HEALTH_PERMIT_OPTIONS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'
import CategoryTag from '@/components/common/CategoryTag.vue'
import StatusTag from '@/components/common/StatusTag.vue'

const route = useRoute()
const router = useRouter()
const censusStore = useCensusStore()
const authStore = useAuthStore()

const task = ref(null)
const accommodations = ref([])
const records = ref([])
const selectedAssignmentId = ref(null)
const fillDialogVisible = ref(false)
const fillForm = ref({})

const FIELD_MAP = {
  name: { label: '单位名称', type: 'input' },
  creditCode: { label: '信用代码', type: 'input' },
  category: { label: '类别', type: 'select', options: CATEGORY_OPTIONS },
  rooms: { label: '客房数', type: 'number' },
  beds: { label: '床位数', type: 'number' },
  occupancyRate: { label: '入住率(%)', type: 'number' },
  adr: { label: '平均房价', type: 'number' },
  revpar: { label: 'RevPAR', type: 'number' },
  annualRevenue: { label: '年营收', type: 'number' },
  staffCount: { label: '从业人数', type: 'number' },
  licenseStatus: { label: '证照状态', type: 'select', options: LICENSE_STATUS_OPTIONS },
  fireInspection: { label: '消防验收', type: 'select', options: FIRE_INSPECTION_OPTIONS },
  healthPermit: { label: '卫生许可', type: 'select', options: HEALTH_PERMIT_OPTIONS },
  hasEmergencyPlan: { label: '应急预案', type: 'input' },
  operatingStatus: { label: '经营状态', type: 'select', options: OPERATING_STATUS_OPTIONS },
  starRating: { label: '星级', type: 'number' },
  brandAffiliation: { label: '品牌', type: 'input' },
  onlineRating: { label: '在线评分', type: 'number' },
  complaintCount: { label: '投诉量', type: 'number' },
  certifications: { label: '认证资质', type: 'input' },
}

const myAssignments = computed(() => censusStore.assignments)

const requiredFields = computed(() => {
  if (!task.value) return []
  try {
    return JSON.parse(task.value.requiredFields || '[]').map(f => FIELD_MAP[f] || { label: f, type: 'input', value: f }).filter(Boolean)
  } catch { return [] }
})

const requiredFieldLabels = computed(() => requiredFields.value.map(f => f.label))

function getRecordStatus(accommodationId) {
  const record = records.value.find(r => r.accommodationId === accommodationId)
  return record?.status || null
}

onMounted(async () => {
  await censusStore.fetchTaskDetail(route.params.id)
  task.value = censusStore.currentTask
})

async function handleAssignmentChange(assignmentId) {
  const assignment = censusStore.assignments.find(a => a.id === assignmentId)
  if (!assignment) return

  // 获取该区域的住宿单位
  accommodations.value = await db.accommodations.where('countyCode').equals(assignment.areaCode).toArray()

  // 如果区县没有数据，尝试按市查询
  if (accommodations.value.length === 0) {
    accommodations.value = await db.accommodations.where('cityCode').equals(assignment.areaCode).toArray()
  }

  // 获取已有填报记录
  await censusStore.fetchRecords(assignmentId)
  records.value = censusStore.records
}

function handleFill(accommodation) {
  const existing = records.value.find(r => r.accommodationId === accommodation.id)
  const form = {}
  requiredFields.value.forEach(f => {
    form[f.value || f.label] = existing?.[f.value || f.label] ?? accommodation[f.value || f.label] ?? ''
  })
  form.accommodationId = accommodation.id
  form.existingRecordId = existing?.id || null
  fillForm.value = form
  fillDialogVisible.value = true
}

async function handleSaveDraft() {
  const data = {
    taskId: Number(route.params.id),
    assignmentId: selectedAssignmentId.value,
    accommodationId: fillForm.value.accommodationId,
    ...fillForm.value,
  }
  delete data.existingRecordId

  if (fillForm.value.existingRecordId) {
    await censusStore.saveRecord({ id: fillForm.value.existingRecordId, ...data })
  } else {
    const rid = await censusStore.saveRecord(data)
    records.value.push({ id: rid, ...data, status: 'draft' })
  }

  ElMessage.success('草稿已保存')
  fillDialogVisible.value = false
}

async function handleSubmitFill() {
  await handleSaveDraft()
  const record = records.value.find(r => r.accommodationId === fillForm.value.accommodationId)
  if (record?.id) {
    await censusStore.submitRecord(record.id)
    record.status = 'submitted'
  }
  ElMessage.success('已提交')
  fillDialogVisible.value = false
}

async function handleSubmitRecord(accommodation) {
  const record = records.value.find(r => r.accommodationId === accommodation.id)
  if (record?.id) {
    await censusStore.submitRecord(record.id)
    record.status = 'submitted'
    ElMessage.success('已提交')
  }
}
</script>
