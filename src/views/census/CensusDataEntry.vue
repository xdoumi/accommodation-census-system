<template>
  <div class="page-container">
    <el-page-header @back="router.push(`/census/${route.params.id}`)" :title="'返回任务详情'">
      <template #content>
        <span class="page-title">数据填报 - {{ task?.title }}</span>
      </template>
    </el-page-header>

    <div v-if="task" style="margin-top: 20px;">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        <p>PC 端可查看移动端上传记录，也可按同一字段规范进行补录。移动端提交后会自动出现在本页和任务详情页。</p>
      </el-alert>

      <el-card shadow="never" style="margin-bottom: 16px;">
        <template #header><span>选择填报区域</span></template>
        <el-select v-model="selectedAssignmentId" placeholder="请选择要填报的区域" style="width: 320px" @change="handleAssignmentChange">
          <el-option v-for="a in myAssignments" :key="a.id" :label="a.areaName || a.areaCode" :value="a.id">
            <span>{{ a.areaName || a.areaCode }}</span>
            <StatusTag :value="a.status" :options="CENSUS_ASSIGNMENT_STATUS_OPTIONS" style="margin-left: 8px;" />
          </el-option>
        </el-select>
      </el-card>

      <el-card shadow="never" v-if="selectedAssignmentId">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>住宿单位填报</span>
            <div>
              <el-tag style="margin-right: 8px;">单位 {{ accommodations.length }} 个</el-tag>
              <el-tag type="success">记录 {{ records.length }} 条</el-tag>
            </div>
          </div>
        </template>

        <el-table :data="accommodations" stripe border size="small">
          <el-table-column prop="name" label="单位名称" min-width="180" />
          <el-table-column prop="creditCode" label="信用代码" min-width="170" show-overflow-tooltip />
          <el-table-column label="填报状态" width="110" align="center">
            <template #default="{ row }">
              <StatusTag :value="getRecord(row.id)?.status || null" :options="CENSUS_RECORD_STATUS_OPTIONS" />
            </template>
          </el-table-column>
          <el-table-column label="提交来源" width="100" align="center">
            <template #default="{ row }">
              <span>{{ getRecord(row.id)?.source === 'mobile' ? '移动端' : getRecord(row.id) ? 'PC端' : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="190" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openFill(row)">
                {{ getRecord(row.id) ? '查看/编辑' : '填报' }}
              </el-button>
              <el-button v-if="canCurrentUserReview(getRecord(row.id))" link type="success" size="small" @click="reviewRecord(getRecord(row.id), 'approve')">{{ currentReviewStep?.approveText || '审核' }}</el-button>
              <el-button v-if="canCurrentUserReview(getRecord(row.id))" link type="danger" size="small" @click="reviewRecord(getRecord(row.id), 'reject')">{{ currentReviewStep?.rejectText || '驳回' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-dialog v-model="fillDialogVisible" title="采集数据补录" width="960px" top="5vh" destroy-on-close>
      <el-tabs v-model="activeModuleKey">
        <el-tab-pane v-for="module in formModules" :key="module.key" :label="module.shortTitle" :name="module.key">
          <el-form :model="fillForm" label-width="190px" class="pc-entry-form">
            <el-row :gutter="16">
              <el-col v-for="key in visibleFields(module)" :key="key" :span="fieldSpan(key)">
                <el-form-item :label="fieldLabel(key)">
                  <component
                    :is="fieldComponent(key)"
                    v-model="fillForm[key]"
                    :field-key="key"
                    :field="FIELD_MAP[key]"
                    :form="fillForm"
                    @industry-change="syncIndustryCode"
                    @ota-change="handleOtaChange"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="fillDialogVisible = false">取消</el-button>
        <el-button type="info" @click="saveFill('draft')">保存草稿</el-button>
        <el-button type="primary" @click="saveFill('submitted')">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
} from 'element-plus'
import { useCensusStore } from '@/stores/census'
import db from '@/db'
import {
  CENSUS_ASSIGNMENT_STATUS_OPTIONS,
  CENSUS_RECORD_STATUS_OPTIONS,
} from '@/utils/constants'
import {
  COLLECTION_FIELD_MAP as FIELD_MAP,
  COLLECTION_MODULES,
  INDUSTRY_OPTIONS,
  buildCollectionFormFromUnit,
  createEmptyCollectionForm,
  extractAccommodationPatch,
  getVisibleModuleFields,
  inferStarIndustryFlag,
  shouldSkipBusinessModule,
} from '@/utils/collectionSpec'
import StatusTag from '@/components/common/StatusTag.vue'
import { buildReviewPatch, canReviewRecord, getReviewStepForRole, INITIAL_REVIEW_STATUS } from '@/utils/reviewFlow'
import { useAuthStore } from '@/stores/auth'
import { publishRecordToAccommodation } from '@/utils/accommodationWorkflow'

const route = useRoute()
const router = useRouter()
const censusStore = useCensusStore()
const authStore = useAuthStore()

const task = ref(null)
const accommodations = ref([])
const records = ref([])
const selectedAssignmentId = ref(null)
const fillDialogVisible = ref(false)
const activeModuleKey = ref('A')
const activeAccommodation = ref(null)
const activeRecord = ref(null)
const fillForm = reactive(createEmptyCollectionForm())

const myAssignments = computed(() => censusStore.assignments)
const formModules = computed(() => COLLECTION_MODULES.filter(module => module.key !== 'PREVIEW' && visibleFields(module).length > 0))
const currentReviewStep = computed(() => getReviewStepForRole(authStore.userRole))

function visibleFields(module) {
  if (module.key === 'B' && shouldSkipBusinessModule(fillForm)) return []
  return getVisibleModuleFields(module, fillForm)
}

onMounted(async () => {
  await censusStore.fetchTaskDetail(route.params.id)
  task.value = censusStore.currentTask
  if (route.query.assignmentId) {
    selectedAssignmentId.value = Number(route.query.assignmentId)
    await handleAssignmentChange(selectedAssignmentId.value)
  }
  if (route.query.recordId) {
    await openRecordById(Number(route.query.recordId))
  }
})

async function handleAssignmentChange(assignmentId) {
  const assignment = censusStore.assignments.find(a => a.id === assignmentId)
  if (!assignment) return
  const targetIds = parseArray(assignment.targetAccommodationIds).map(Number).filter(Boolean)
  if (targetIds.length) {
    const targetUnits = []
    for (const id of targetIds) {
      const unit = await db.accommodations.get(id)
      if (unit && !unit.deletedAt) targetUnits.push(unit)
    }
    accommodations.value = targetUnits
    await loadRecords()
    return
  }
  accommodations.value = (await db.accommodations.where('countyCode').equals(assignment.areaCode).toArray()).filter(item => !item.deletedAt)
  if (accommodations.value.length === 0) {
    accommodations.value = (await db.accommodations.where('cityCode').equals(assignment.areaCode).toArray()).filter(item => !item.deletedAt)
  }
  await loadRecords()
}

function parseArray(raw) {
  try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
}

async function loadRecords() {
  await censusStore.fetchRecords(selectedAssignmentId.value)
  records.value = [...censusStore.records]
}

function getRecord(accommodationId) {
  return records.value.find(record => record.accommodationId === accommodationId)
}

function openFill(accommodation) {
  activeAccommodation.value = accommodation
  activeRecord.value = getRecord(accommodation.id) || null
  const base = buildCollectionFormFromUnit(accommodation)
  if (activeRecord.value?.formData) {
    try { Object.assign(base, JSON.parse(activeRecord.value.formData)) } catch { /* ignore */ }
  }
  Object.assign(fillForm, createEmptyCollectionForm(), base)
  activeModuleKey.value = 'A'
  fillDialogVisible.value = true
}

async function openRecordById(recordId) {
  const record = await db.censusRecords.get(recordId)
  if (!record) return
  activeRecord.value = record
  activeAccommodation.value = record.accommodationId ? await db.accommodations.get(record.accommodationId) : null
  if (!selectedAssignmentId.value && record.assignmentId) {
    selectedAssignmentId.value = record.assignmentId
    await handleAssignmentChange(record.assignmentId)
  }
  const base = activeAccommodation.value ? buildCollectionFormFromUnit(activeAccommodation.value) : createEmptyCollectionForm()
  if (record.formData) {
    try { Object.assign(base, JSON.parse(record.formData)) } catch { /* ignore */ }
  }
  Object.assign(fillForm, createEmptyCollectionForm(), base)
  activeModuleKey.value = 'A'
  fillDialogVisible.value = true
}

async function saveFill(status) {
  const now = new Date().toISOString()
  const data = {
    taskId: Number(route.params.id),
    assignmentId: selectedAssignmentId.value,
    accommodationId: activeAccommodation.value?.id || null,
    status: status === 'submitted' ? INITIAL_REVIEW_STATUS : status,
    formData: JSON.stringify({ ...fillForm, submittedAt: status === 'submitted' ? now : fillForm.submittedAt }),
    submittedAt: status === 'submitted' ? now : null,
    source: 'pc',
    unitName: fillForm.operatingName || fillForm.registeredName || fillForm.unitName,
    creditCode: fillForm.creditCode,
    checkType: fillForm.checkType,
    catalogSource: fillForm.catalogSource,
    licenseType: fillForm.licenseType,
    managerSignature: fillForm.managerSignature,
    managerSignatureAt: fillForm.managerSignatureAt,
    location: fillForm.location ? JSON.stringify(fillForm.location) : '',
    reviewLevel: status === 'submitted' ? 'county' : undefined,
    reviewAction: status === 'submitted' ? 'submit' : undefined,
  }
  if (activeRecord.value?.id) {
    await censusStore.saveRecord({ id: activeRecord.value.id, ...data })
  } else {
    await censusStore.saveRecord(data)
  }
  if (status === 'available' && activeAccommodation.value?.id) {
    await db.accommodations.update(activeAccommodation.value.id, extractAccommodationPatch(fillForm))
  }
  await loadRecords()
  ElMessage.success(status === 'submitted' ? '已提交' : '草稿已保存')
  fillDialogVisible.value = false
}

function canCurrentUserReview(record) {
  return authStore.hasPermission('census:review') && canReviewRecord(record, authStore.userRole) && isRecordInReviewScope(record)
}

function isRecordInReviewScope(record) {
  const role = authStore.userRole
  if (['super_admin', 'provincial_admin'].includes(role)) return true
  const assignment = censusStore.assignments.find(item => item.id === record?.assignmentId)
  const areaCode = assignment?.areaCode || ''
  if (role === 'county_admin') return areaCode === authStore.userAreaCode
  if (role === 'city_admin') return areaCode.startsWith(authStore.userAreaCode.substring(0, 4))
  return false
}

async function reviewRecord(record, action) {
  if (!record) return
  try {
    const patch = buildReviewPatch(record, authStore.userRole, action, authStore.currentUser?.id)
    await db.censusRecords.update(record.id, patch)
    Object.assign(record, patch)
    if (patch.status === 'available') await publishRecordToAccommodation(record)
    ElMessage.success(patch.status === 'available' ? '省级审核通过，记录已可用' : '已提交下一级审核')
  } catch (error) {
    ElMessage.error(error.message || '审核失败')
  }
}

function syncIndustryCode(value) {
  fillForm.economyIndustryCode = value
  fillForm.isStarIndustryCode = inferStarIndustryFlag(value)
}

function handleOtaChange(value) {
  if (value.includes('none') && value.length > 1) fillForm.otaPlatforms = ['none']
}

function fieldLabel(key) {
  const field = FIELD_MAP[key]
  return field ? `${field.code} ${field.label}` : key
}

function fieldSpan(key) {
  const type = FIELD_MAP[key]?.type
  return ['textarea', 'checkbox', 'photos', 'photo', 'signature', 'location'].includes(type) ? 24 : 12
}

function fieldComponent(key) {
  const type = FIELD_MAP[key]?.type
  if (type === 'select') return SelectControl
  if (type === 'radio') return RadioControl
  if (type === 'checkbox') return CheckboxControl
  if (type === 'industry') return IndustryControl
  if (type === 'textarea') return TextareaControl
  if (type === 'integer') return NumberControl
  if (type === 'date') return DateControl
  if (type === 'location') return LocationControl
  if (['photo', 'photos', 'signature'].includes(type)) return AssetPlaceholder
  return TextControl
}

const TextControl = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElInput, { modelValue: props.modelValue, 'onUpdate:modelValue': v => emit('update:modelValue', v) })
  },
})

const TextareaControl = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElInput, { type: 'textarea', rows: 3, modelValue: props.modelValue, 'onUpdate:modelValue': v => emit('update:modelValue', v) })
  },
})

const NumberControl = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElInputNumber, { modelValue: props.modelValue, min: 0, style: 'width: 100%', 'onUpdate:modelValue': v => emit('update:modelValue', v) })
  },
})

const DateControl = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElDatePicker, { modelValue: props.modelValue, type: 'date', valueFormat: 'YYYY-MM-DD', style: 'width: 100%', 'onUpdate:modelValue': v => emit('update:modelValue', v) })
  },
})

const SelectControl = defineComponent({
  props: ['modelValue', 'field'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElSelect, { modelValue: props.modelValue, style: 'width: 100%', 'onUpdate:modelValue': v => emit('update:modelValue', v) }, () =>
      (props.field.options || []).map(opt => h(ElOption, { label: opt.label, value: opt.value })),
    )
  },
})

const RadioControl = defineComponent({
  props: ['modelValue', 'field'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElRadioGroup, { modelValue: props.modelValue, 'onUpdate:modelValue': v => emit('update:modelValue', v) }, () =>
      (props.field.options || []).map(opt => h(ElRadio, { label: opt.value }, () => opt.label)),
    )
  },
})

const CheckboxControl = defineComponent({
  props: ['modelValue', 'field'],
  emits: ['update:modelValue', 'ota-change'],
  setup(props, { emit }) {
    return () => h(ElCheckboxGroup, {
      modelValue: props.modelValue || [],
      'onUpdate:modelValue': v => { emit('update:modelValue', v); emit('ota-change', v) },
    }, () => (props.field.options || []).map(opt => h(ElCheckbox, { label: opt.value }, () => opt.label)))
  },
})

const IndustryControl = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue', 'industry-change'],
  setup(props, { emit }) {
    return () => h(ElSelect, {
      modelValue: props.modelValue,
      filterable: true,
      style: 'width: 100%',
      'onUpdate:modelValue': v => { emit('update:modelValue', v); emit('industry-change', v) },
    }, () => INDUSTRY_OPTIONS.map(opt => h(ElOption, { label: opt.label, value: opt.value })))
  },
})

const LocationControl = defineComponent({
  props: ['modelValue'],
  setup(props) {
    return () => h('span', null, props.modelValue ? '移动端已采集定位，经纬度已存储' : '移动端自动定位；PC 端补录可留空')
  },
})

const AssetPlaceholder = defineComponent({
  props: ['modelValue', 'field'],
  setup(props) {
    return () => {
      if (props.field.type === 'photos') return h('span', null, Array.isArray(props.modelValue) ? `已上传 ${props.modelValue.length} 张` : '未上传')
      if (props.field.type === 'signature') {
        return props.modelValue
          ? h('img', { class: 'signature-image', src: props.modelValue, alt: '住宿单位负责人签字' })
          : h('span', null, '未签字')
      }
      return h('span', null, props.modelValue ? '已上传' : 'PC 端暂不上传，请使用移动端采集')
    }
  },
})
</script>

<style scoped>
.pc-entry-form :deep(.el-form-item) {
  margin-bottom: 18px;
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
