<template>
  <div
    ref="rootRef"
    class="collection-entry"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <MobileFormStep :steps="stepLabels" :current="currentStep" />

    <div v-if="statusBanner" class="status-banner" :class="statusBanner.type">
      <el-icon><component :is="statusBanner.icon" /></el-icon>
      <span>{{ statusBanner.text }}</span>
    </div>

    <div v-if="readOnly" class="status-banner readonly">
      <el-icon><View /></el-icon>
      <span>当前记录已进入审核流程，仅可查看；草稿或县级驳回记录可继续编辑。</span>
    </div>

    <div class="m-card unit-summary">
      <div>
        <div class="unit-title">{{ form.operatingName || form.registeredName || form.unitName || '新增采集对象' }}</div>
        <div class="unit-subtitle">
          {{ selectedUnit ? '来自导入名录' : '可新增名单' }}
          <span v-if="form.sourceCatalogName"> · {{ form.sourceCatalogName }}</span>
        </div>
      </div>
      <el-tag size="small" :type="selectedUnit ? 'success' : 'warning'">
        {{ selectedUnit ? '名录匹配' : '新增' }}
      </el-tag>
    </div>

    <div class="m-card module-card">
      <div class="module-header">
        <div>
          <div class="module-title">{{ activeModuleTitle }}</div>
        </div>
        <div class="module-count">{{ currentStep + 1 }}/{{ stepLabels.length }}</div>
      </div>

      <template v-if="activeModule.key === 'A'">
        <div class="action-panel">
          <div>
            <div class="panel-title"><span class="required">*</span>A1 定位坐标</div>
            <div class="panel-desc">{{ locationText }}</div>
          </div>
          <el-button type="primary" size="small" :loading="locating" :disabled="readOnly" @click="captureLocation">定位</el-button>
        </div>

        <div class="m-form-group">
          <div class="m-form-label"><span class="required">*</span>A2 单位名称</div>
          <input v-model.trim="form.unitName" class="m-input" :class="{ 'has-error': errors.unitName }" :disabled="readOnly" placeholder="输入关键词可匹配导入名录" />
          <div class="inline-actions">
            <el-button link type="primary" :disabled="readOnly" @click="showUnitPicker = true">从名录选择</el-button>
            <span v-if="selectedUnit" class="matched-text">已匹配：{{ selectedUnit.name }}</span>
          </div>
          <div v-if="errors.unitName" class="m-error">{{ errors.unitName }}</div>
        </div>

        <FieldControl field-key="checkType" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl v-if="isVisibleField('catalogSource')" field-key="catalogSource" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="licenseType" :form="form" :errors="errors" :disabled="readOnly" />
      </template>

      <template v-else-if="activeModule.key === 'B'">
        <PhotoPicker
          label="B1 营业执照或同等效力照片"
          :required="true"
          :value="form.businessLicensePhoto"
          :file-name="form.businessLicensePhotoName"
          :error="errors.businessLicensePhoto"
          :disabled="readOnly"
          @change="handleBusinessLicensePhoto"
        />
        <el-button plain type="primary" style="width: 100%; margin-bottom: 12px;" :disabled="readOnly" @click="mockOcrFill">模拟识别回填</el-button>

        <FieldControl field-key="registeredName" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="creditCode" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="registrationAuthority" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl v-if="form.registrationAuthority === 'other'" field-key="registrationAuthorityOther" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="registrationDate" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="registeredStatus" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="registeredAddress" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="registeredDivisionCode" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="legalRepresentative" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="legalRepresentativePhone" :form="form" :errors="errors" :disabled="readOnly" />
      </template>

      <template v-else-if="activeModule.key === 'C'">
        <div class="copy-row">
          <el-checkbox v-model="sameAsRegisteredName" :disabled="readOnly" @change="syncRegisteredName">经营单位名称同注册名</el-checkbox>
          <el-checkbox v-model="sameAsRegisteredAddress" :disabled="readOnly" @change="syncRegisteredAddress">实际地址同注册地址</el-checkbox>
        </div>
        <FieldControl field-key="operatingName" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="actualOperatingStatus" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="actualAddress" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="divisionCode" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="contactName" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="contactPhone" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="economyIndustryCode" :form="form" :errors="errors" :disabled="readOnly" @industry-change="syncIndustryCode" />
        <FieldControl field-key="stateHolding" :form="form" :errors="errors" :disabled="readOnly" />
      </template>

      <template v-else-if="activeModule.key === 'D'">
        <FieldControl field-key="buildingOwnership" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="businessMode" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl
          v-if="['seasonal', 'reservation', 'mixed', 'other'].includes(form.businessMode)"
          field-key="businessModeRemark"
          :form="form"
          :errors="errors"
          :disabled="readOnly"
        />
        <FieldControl field-key="ratingLevel" :form="form" :errors="errors" :disabled="readOnly" />
        <div class="two-cols">
          <FieldControl field-key="rooms" :form="form" :errors="errors" :disabled="readOnly" />
          <FieldControl field-key="beds" :form="form" :errors="errors" :disabled="readOnly" />
        </div>
        <div class="two-cols">
          <FieldControl field-key="staffCount" :form="form" :errors="errors" :disabled="readOnly" />
          <FieldControl field-key="subjectType" :form="form" :errors="errors" :disabled="readOnly" />
        </div>
      </template>

      <template v-else-if="activeModule.key === 'E'">
        <FieldControl field-key="policeSystemStatus" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl
          v-if="['newly_added', 'not_connected'].includes(form.policeSystemStatus)"
          field-key="policeSystemReason"
          :form="form"
          :errors="errors"
          :disabled="readOnly"
        />
        <FieldControl field-key="inOriginalCultureTourismList" :form="form" :errors="errors" :disabled="readOnly" />
      </template>

      <template v-else-if="activeModule.key === 'F'">
        <FieldControl field-key="otaPlatforms" :form="form" :errors="errors" :disabled="readOnly" @ota-change="handleOtaChange" />
        <FieldControl v-if="form.otaPlatforms.includes('other')" field-key="otaOther" :form="form" :errors="errors" :disabled="readOnly" />
      </template>

      <template v-else-if="activeModule.key === 'G'">
        <MultiPhotoPicker
          label="住宿单位门头照"
          :required="true"
          :value="form.storefrontPhotos"
          :error="errors.storefrontPhotos"
          :disabled="readOnly"
          @change="value => form.storefrontPhotos = value"
        />
        <MultiPhotoPicker
          label="核查人员与门头合影"
          :required="true"
          :value="form.groupPhotos"
          :error="errors.groupPhotos"
          :disabled="readOnly"
          @change="value => form.groupPhotos = value"
        />
        <SignaturePad
          label="住宿单位负责人签字"
          :value="form.managerSignature"
          :error="errors.managerSignature"
          :disabled="readOnly"
          @change="handleSignatureChange"
        />
      </template>

      <template v-else>
        <SubmitPreview :form="form" />
      </template>
    </div>

    <div class="m-bottom-bar">
      <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
      <el-button v-if="!readOnly" type="info" @click="saveDraft">暂存</el-button>
      <el-button v-if="currentStep < stepLabels.length - 1" type="primary" @click="nextStep">下一步</el-button>
      <el-button v-else-if="!readOnly" type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      <el-button v-else type="primary" @click="router.push('/m/units')">返回清单</el-button>
    </div>

    <el-drawer v-model="showUnitPicker" direction="btt" size="78%" title="选择导入名录">
      <div class="drawer-search">
        <input v-model="unitSearch" class="m-input" placeholder="搜索单位名称或信用代码" />
      </div>
      <div
        v-for="unit in filteredUnits"
        :key="unit.id"
        class="unit-item"
        :class="{ selected: selectedUnit?.id === unit.id }"
        @click="selectUnit(unit)"
      >
        <div>
          <div class="unit-name">{{ unit.name }}</div>
          <div class="unit-address">{{ unit.creditCode }} · {{ unit.detailAddress }}</div>
        </div>
        <el-icon v-if="selectedUnit?.id === unit.id" color="#1a5fc5"><Check /></el-icon>
      </div>
      <el-empty v-if="filteredUnits.length === 0" description="未找到匹配单位" />
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  COLLECTION_FIELD_MAP,
  COLLECTION_MODULES,
  COLLECTION_STEP_LABELS,
  INDUSTRY_OPTIONS,
  buildCollectionFormFromUnit,
  createEmptyCollectionForm,
  extractAccommodationPatch,
  getVisibleModuleFields,
  getOptionLabel,
  isFieldVisible,
  isFieldRequired,
  shouldSkipBusinessModule,
} from '@/utils/collectionSpec'
import { useCensusStore } from '@/stores/census'
import { useOfflineQueue } from '@/composables/useOfflineQueue'
import db from '@/db'
import MobileFormStep from '@/components/mobile/MobileFormStep.vue'
import { INITIAL_REVIEW_STATUS } from '@/utils/reviewFlow'

const route = useRoute()
const router = useRouter()
const censusStore = useCensusStore()
const offlineQueue = useOfflineQueue()

const rootRef = ref(null)
const currentStep = ref(0)
const stepLabels = COLLECTION_STEP_LABELS
const form = reactive(createEmptyCollectionForm())
const errors = ref({})
const units = ref([])
const selectedUnit = ref(null)
const showUnitPicker = ref(false)
const unitSearch = ref('')
const submitting = ref(false)
const locating = ref(false)
const sameAsRegisteredName = ref(false)
const sameAsRegisteredAddress = ref(false)
const editingRecordId = ref(route.query.recordId ? Number(route.query.recordId) : null)
const readOnly = ref(false)

const activeModule = computed(() => COLLECTION_MODULES[currentStep.value])
const activeModuleTitle = computed(() => activeModule.value.key === 'PREVIEW' ? '提交预览' : `${activeModule.value.key} ${activeModule.value.title}`)
const draftKey = computed(() => `collection_form_${route.params.taskId}_${route.params.assignmentId || 'global'}_${selectedUnit.value?.id || form.creditCode || form.unitName || 'new'}`)

const filteredUnits = computed(() => {
  const kw = unitSearch.value.trim().toLowerCase()
  if (!kw) return units.value.slice(0, 80)
  return units.value.filter(unit => {
    return unit.name?.toLowerCase().includes(kw) || unit.creditCode?.toLowerCase().includes(kw)
  }).slice(0, 80)
})

const locationText = computed(() => {
  if (!form.location) return '尚未获取定位，进入采集任务后请先授权定位。'
  const suffix = form.locationCapturedAt ? ` · ${new Date(form.locationCapturedAt).toLocaleString('zh-CN', { hour12: false })}` : ''
  return `${form.locationAddress || currentAddressDescription()}${form.locationAccuracy ? ` · 精度约 ${Math.round(form.locationAccuracy)}m` : ''}${suffix}`
})

const statusBanner = computed(() => {
  if (!offlineQueue.isOnline.value) {
    return { type: 'offline', icon: 'WarningFilled', text: '当前离线，提交会进入同步队列' }
  }
  if (offlineQueue.pendingCount.value > 0) {
    return { type: 'syncing', icon: 'Refresh', text: `后台待同步 ${offlineQueue.pendingCount.value} 条` }
  }
  return null
})

onMounted(async () => {
  offlineQueue.start()
  await censusStore.fetchTaskDetail(route.params.taskId)
  await loadUnits()
  if (editingRecordId.value) await restoreRecord(editingRecordId.value)
  if (!form.location) captureLocation(false)
})

watch(form, () => {
  if (readOnly.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveLocalDraft, 700)
}, { deep: true })

let saveTimer = null

async function loadUnits() {
  const assignmentId = route.params.assignmentId
  if (assignmentId) {
    const assignment = censusStore.assignments.find(a => a.id === Number(assignmentId))
    if (assignment) {
      units.value = await db.accommodations.where('countyCode').equals(assignment.areaCode).toArray()
      if (units.value.length === 0) {
        units.value = await db.accommodations.where('cityCode').equals(assignment.areaCode).toArray()
      }
      return
    }
  }
  units.value = await db.accommodations.toArray()
}

function selectUnit(unit) {
  const currentForm = { ...form }
  const unitForm = buildCollectionFormFromUnit(unit)
  selectedUnit.value = unit
  editingRecordId.value = null
  Object.assign(form, unitForm)
  fillMissingFormValues(form, currentForm)
  const restored = restoreLocalDraft()
  if (restored) {
    fillMissingFormValues(form, unitForm)
    ElMessage.success('已恢复该单位草稿，并补全名录已有字段')
  } else {
    ElMessage.success('已回写名录已有字段')
  }
  showUnitPicker.value = false
}

function fillMissingFormValues(target, source) {
  Object.keys(source || {}).forEach(key => {
    if (!isFilledValue(target[key]) && isFilledValue(source[key])) {
      target[key] = Array.isArray(source[key]) ? [...source[key]] : source[key]
    }
  })
}

function isFilledValue(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return value !== '' && value !== null && value !== undefined
}

async function restoreRecord(recordId) {
  const record = await db.censusRecords.get(Number(recordId))
  if (!record) return
  readOnly.value = route.query.mode === 'view' || !canEditRecord(record)
  if (record.formData) {
    try { Object.assign(form, createEmptyCollectionForm(), JSON.parse(record.formData)) } catch { /* ignore */ }
  }
  selectedUnit.value = units.value.find(u => u.id === record.accommodationId) || null
  currentStep.value = 0
  ElMessage.success(readOnly.value ? '已打开单位填报记录' : '已打开单位填报记录，可继续修改')
}

function canEditRecord(record) {
  return ['draft', 'county_rejected'].includes(record?.status)
}

function saveLocalDraft() {
  try {
    localStorage.setItem(draftKey.value, JSON.stringify({
      form: { ...form },
      selectedUnitId: selectedUnit.value?.id || null,
      currentStep: currentStep.value,
      ts: Date.now(),
    }))
  } catch { /* ignore storage quota errors */ }
}

function restoreLocalDraft() {
  try {
    const raw = localStorage.getItem(draftKey.value)
    if (!raw) return false
    const draft = JSON.parse(raw)
    Object.assign(form, createEmptyCollectionForm(), draft.form || {})
    if (Number.isInteger(draft.currentStep)) currentStep.value = draft.currentStep
    return true
  } catch {
    return false
  }
}

function clearLocalDraft() {
  try { localStorage.removeItem(draftKey.value) } catch { /* ignore */ }
}

async function captureLocation(showMessage = true) {
  if (!navigator.geolocation) {
    if (showMessage) ElMessage.warning('当前浏览器不支持定位')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    position => {
      form.location = {
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
      }
      form.locationAccuracy = position.coords.accuracy
      form.locationCapturedAt = new Date().toISOString()
      if (!form.locationAddress) form.locationAddress = currentAddressDescription()
      if (showMessage) ElMessage.success('定位已获取')
      locating.value = false
    },
    () => {
      if (showMessage) ElMessage.warning('定位失败，请检查授权后重试')
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
  )
}

function handleBusinessLicensePhoto({ dataUrl, name }) {
  form.businessLicensePhoto = dataUrl
  form.businessLicensePhotoName = name
  mockOcrFill()
}

function mockOcrFill() {
  const source = selectedUnit.value || {}
  form.registeredName ||= source.name || form.unitName
  form.creditCode ||= source.creditCode || ''
  form.registrationDate ||= source.openDate || new Date().toISOString().slice(0, 10)
  form.registeredAddress ||= source.registeredAddress || source.detailAddress || form.locationAddress || ''
  form.registeredDivisionCode ||= source.divisionCode || form.divisionCode || (source.countyCode ? `${source.countyCode}000000` : '')
  form.legalRepresentative ||= source.legalRepresentative || '待人工核对'
  form.legalRepresentativePhone ||= source.legalRepresentativePhone || ''
  ElMessage.success('已模拟 OCR 回填，请逐项核对')
}

function syncRegisteredName() {
  if (sameAsRegisteredName.value) form.operatingName = form.registeredName
}

function currentAddressDescription() {
  return selectedUnit.value?.detailAddress || form.actualAddress || form.registeredAddress || '贵阳市云岩区北京路12号贵旅大厦'
}

function syncRegisteredAddress() {
  if (sameAsRegisteredAddress.value) form.actualAddress = form.registeredAddress
}

function syncIndustryCode(value) {
  form.economyIndustryCode = value
}

function handleOtaChange(value) {
  if (value.includes('none') && value.length > 1) {
    form.otaPlatforms = ['none']
  }
}

function isVisibleField(key) {
  return isFieldVisible(key, form)
}

function visibleFields(module) {
  if (module.key === 'B' && shouldSkipBusinessModule(form)) return []
  return getVisibleModuleFields(module, form)
}

function nextStepIndex(step = currentStep.value) {
  const next = step + 1
  if (COLLECTION_MODULES[next]?.key === 'B' && shouldSkipBusinessModule(form)) {
    return Math.min(next + 1, stepLabels.length - 1)
  }
  return Math.min(next, stepLabels.length - 1)
}

function prevStepIndex(step = currentStep.value) {
  const prev = step - 1
  if (COLLECTION_MODULES[prev]?.key === 'B' && shouldSkipBusinessModule(form)) {
    return Math.max(prev - 1, 0)
  }
  return Math.max(prev, 0)
}

function handleSignatureChange(dataUrl) {
  form.managerSignature = dataUrl
  form.managerSignatureAt = new Date().toISOString()
}

function validateStep(step = currentStep.value) {
  const module = COLLECTION_MODULES[step]
  const fields = visibleFields(module)
  const nextErrors = { ...errors.value }
  for (const key of Object.keys(nextErrors)) {
    if (module.fields.includes(key)) delete nextErrors[key]
  }
  for (const key of fields) {
    const field = COLLECTION_FIELD_MAP[key]
    if (!field || !isFieldRequired(key, form)) continue
    const value = form[key]
    if (field.type === 'location' && !form.location) nextErrors[key] = '请先获取定位'
    else if (field.type === 'checkbox' && (!Array.isArray(value) || value.length === 0)) nextErrors[key] = '请选择至少一项'
    else if (['photo', 'signature'].includes(field.type) && !value) nextErrors[key] = '请上传或填写'
    else if (field.type === 'photos' && (!Array.isArray(value) || value.length === 0)) nextErrors[key] = '请至少上传一张'
    else if (value === '' || value === null || value === undefined) nextErrors[key] = '必填项'
    if (!nextErrors[key] && field.pattern && value && !field.pattern.test(String(value))) nextErrors[key] = '格式不正确'
  }
  if (module.key === 'B' && form.registrationDate && form.registrationDate > new Date().toISOString().slice(0, 10)) {
    nextErrors.registrationDate = '登记时间不得晚于采集日期'
  }
  if (module.key === 'D') {
    if (Number(form.rooms) < 0) nextErrors.rooms = '请填写不小于 0 的整数'
    if (Number(form.beds) < 0) nextErrors.beds = '请填写不小于 0 的整数'
  }
  errors.value = nextErrors
  return !fields.some(key => errors.value[key])
}

function validateAll() {
  errors.value = {}
  for (let i = 0; i < COLLECTION_MODULES.length - 1; i++) {
    validateStep(i)
  }
  const firstErrorKey = Object.keys(errors.value)[0]
  if (firstErrorKey) {
    const step = COLLECTION_MODULES.findIndex(m => m.fields.includes(firstErrorKey))
    if (step >= 0) currentStep.value = step
    return false
  }
  return true
}

function prevStep() {
  if (currentStep.value > 0) currentStep.value = prevStepIndex()
}

function nextStep() {
  if (!validateStep()) {
    ElMessage.error('请补全当前模块必填项')
    return
  }
  if (currentStep.value < stepLabels.length - 1) currentStep.value = nextStepIndex()
  nextTick(() => rootRef.value?.scrollIntoView({ block: 'start' }))
}

async function saveDraft() {
  if (readOnly.value) return
  saveLocalDraft()
  await saveRecord('draft')
  ElMessage.success('草稿已保存')
}

async function handleSubmit() {
  if (readOnly.value) return
  if (!validateAll()) {
    ElMessage.error('存在未完成字段，请核对后提交')
    return
  }
  submitting.value = true
  try {
    const recordId = await saveRecord('submitted')
    if (route.params.assignmentId) {
      await censusStore.updateAssignment(Number(route.params.assignmentId), { status: 'submitted', progress: 100, submittedAt: new Date().toISOString() })
    }
    offlineQueue.flush()
    clearLocalDraft()
    ElMessage.success(`提交成功，记录号 ${recordId}`)
    router.back()
  } catch (err) {
    ElMessage.error('提交失败：' + err.message)
  } finally {
    submitting.value = false
  }
}

async function saveRecord(status) {
  const taskId = Number(route.params.taskId)
  const assignmentId = route.params.assignmentId ? Number(route.params.assignmentId) : null
  const now = new Date().toISOString()
  const payload = {
    taskId,
    assignmentId,
    accommodationId: selectedUnit.value?.id || null,
    status: status === 'submitted' ? INITIAL_REVIEW_STATUS : status,
    formData: JSON.stringify({ ...form, submittedAt: status === 'submitted' ? now : form.submittedAt }),
    submittedAt: status === 'submitted' ? now : null,
    source: 'mobile',
    unitName: form.operatingName || form.registeredName || form.unitName,
    creditCode: form.creditCode,
    checkType: form.checkType,
    catalogSource: form.catalogSource,
    licenseType: form.licenseType,
    location: form.location ? JSON.stringify(form.location) : '',
    reviewLevel: status === 'submitted' ? 'county' : undefined,
    reviewAction: status === 'submitted' ? 'submit' : undefined,
  }
  const existing = await findExistingRecord()
  if (editingRecordId.value) {
    await censusStore.saveRecord({ id: editingRecordId.value, ...payload })
    return editingRecordId.value
  }
  if (existing) {
    await censusStore.saveRecord({ id: existing.id, ...payload })
    return existing.id
  }
  return await censusStore.saveRecord(payload)
}

async function findExistingRecord() {
  const assignmentId = route.params.assignmentId ? Number(route.params.assignmentId) : null
  const all = assignmentId
    ? await db.censusRecords.where('assignmentId').equals(assignmentId).toArray()
    : await db.censusRecords.where('taskId').equals(Number(route.params.taskId)).toArray()
  return all.find(record => {
    if (selectedUnit.value?.id && record.accommodationId === selectedUnit.value.id) return true
    if (form.creditCode && record.creditCode === form.creditCode) return true
    return false
  })
}

let touchStartX = 0
let touchStartY = 0
function onTouchStart(e) {
  if (!e.touches?.[0]) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}
function onTouchEnd(e) {
  if (!e.changedTouches?.[0]) return
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return
  if (dx < 0) nextStep()
  else prevStep()
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function buildPhotoWatermark() {
  const time = new Date().toLocaleString('zh-CN', { hour12: false })
  return `${form.locationAddress || '贵阳市云岩区北京路12号贵旅大厦'} ${time}`
}

async function fileToWatermarkedDataUrl(file, watermark) {
  const dataUrl = await fileToDataUrl(file)
  return new Promise(resolve => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth || image.width
      canvas.height = image.naturalHeight || image.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)
      const fontSize = Math.max(24, Math.round(canvas.width / 32))
      ctx.font = `${fontSize}px sans-serif`
      ctx.textBaseline = 'bottom'
      const padding = Math.round(fontSize * 0.7)
      const metrics = ctx.measureText(watermark)
      const rectHeight = fontSize + padding * 1.4
      ctx.fillStyle = 'rgba(0, 0, 0, 0.56)'
      ctx.fillRect(0, canvas.height - rectHeight, Math.min(canvas.width, metrics.width + padding * 2), rectHeight)
      ctx.fillStyle = '#fff'
      ctx.fillText(watermark, padding, canvas.height - padding / 2)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })
}

const FieldControl = defineComponent({
  props: {
    fieldKey: { type: String, required: true },
    form: { type: Object, required: true },
    errors: { type: Object, required: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ['industry-change', 'ota-change'],
  setup(props, { emit }) {
    return () => {
      const field = COLLECTION_FIELD_MAP[props.fieldKey]
      if (!field) return null
      const required = isFieldRequired(props.fieldKey, props.form)
      const label = h('div', { class: 'm-form-label' }, [
        required ? h('span', { class: 'required' }, '*') : null,
        `${field.code} ${field.label}`,
      ])
      const common = {
        class: ['m-input', { 'has-error': props.errors[props.fieldKey] }],
        value: props.form[props.fieldKey],
        placeholder: `请输入${field.label}`,
        maxlength: field.maxLength,
        disabled: props.disabled,
        onInput: event => { props.form[props.fieldKey] = event.target.value },
      }
      let control
      if (field.type === 'textarea') {
        control = h('textarea', { ...common, class: ['m-textarea', { 'has-error': props.errors[props.fieldKey] }] })
      } else if (field.type === 'select') {
        control = h('select', {
          class: ['m-select', { 'has-error': props.errors[props.fieldKey] }],
          value: props.form[props.fieldKey],
          disabled: props.disabled,
          onChange: event => { props.form[props.fieldKey] = event.target.value },
        }, [
          h('option', { value: '' }, '请选择'),
          ...(field.options || []).map(opt => h('option', { value: opt.value }, opt.label)),
        ])
      } else if (field.type === 'radio') {
        control = h('div', { class: 'radio-list' }, field.options.map(opt => h('label', { class: 'choice-line' }, [
          h('input', {
            type: 'radio',
            name: props.fieldKey,
            value: opt.value,
            checked: props.form[props.fieldKey] === opt.value,
            disabled: props.disabled,
            onChange: () => { props.form[props.fieldKey] = opt.value },
          }),
          h('span', null, opt.label),
        ])))
      } else if (field.type === 'checkbox') {
        control = h('div', { class: 'checkbox-list' }, field.options.map(opt => h('label', { class: 'choice-line' }, [
          h('input', {
            type: 'checkbox',
            value: opt.value,
            checked: props.form[props.fieldKey]?.includes(opt.value),
            disabled: props.disabled,
            onChange: () => {
            const set = new Set(props.form[props.fieldKey] || [])
            if (set.has(opt.value)) set.delete(opt.value)
            else set.add(opt.value)
            props.form[props.fieldKey] = Array.from(set)
            emit('ota-change', props.form[props.fieldKey])
            },
          }),
          h('span', null, opt.label),
        ])))
      } else if (field.type === 'industry') {
        control = h('select', {
          class: ['m-select', { 'has-error': props.errors[props.fieldKey] }],
          value: props.form[props.fieldKey],
          disabled: props.disabled,
          onChange: event => {
            props.form[props.fieldKey] = event.target.value
            emit('industry-change', event.target.value)
          },
        }, [
          h('option', { value: '' }, '请选择或搜索行业代码'),
          ...INDUSTRY_OPTIONS.map(opt => h('option', { value: opt.value }, opt.label)),
        ])
      } else {
        control = h('input', { ...common, type: field.type === 'integer' ? 'number' : field.type === 'date' ? 'date' : field.type === 'tel' ? 'tel' : 'text' })
      }
      return h('div', { class: 'm-form-group' }, [
        label,
        control,
        props.errors[props.fieldKey] ? h('div', { class: 'm-error' }, props.errors[props.fieldKey]) : null,
      ])
    }
  },
})

const PhotoPicker = defineComponent({
  props: {
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    value: { type: String, default: '' },
    fileName: { type: String, default: '' },
    error: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['change'],
  setup(props, { emit }) {
    async function onChange(event) {
      const file = event.target.files?.[0]
      if (!file) return
      emit('change', { dataUrl: await fileToDataUrl(file), name: file.name })
      event.target.value = ''
    }
    return () => h('div', { class: 'm-form-group' }, [
      h('div', { class: 'm-form-label' }, [props.required ? h('span', { class: 'required' }, '*') : null, props.label]),
      props.value
        ? h(props.disabled ? 'div' : 'label', { class: ['file-row', { clickable: !props.disabled }] }, [
          h('span', { class: 'file-name' }, props.fileName || '已上传图片'),
          props.disabled ? null : h('span', { class: 'file-action' }, '点击重传/拍照'),
          props.disabled ? null : h('input', { type: 'file', accept: 'image/*', onChange }),
        ])
        : h('div', { class: 'camera-actions' }, [
          h('label', { class: ['camera-button', 'primary', { error: props.error }] }, [
            h('span', null, '拍摄'),
            props.disabled ? null : h('input', { type: 'file', accept: 'image/*', capture: 'environment', onChange }),
          ]),
          h('label', { class: ['camera-button', { error: props.error }] }, [
            h('span', null, '从相册中选取'),
            props.disabled ? null : h('input', { type: 'file', accept: 'image/*', onChange }),
          ]),
        ]),
      props.error ? h('div', { class: 'm-error' }, props.error) : null,
    ])
  },
})

const MultiPhotoPicker = defineComponent({
  props: {
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    value: { type: Array, default: () => [] },
    error: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['change'],
  setup(props, { emit }) {
    async function onChange(event) {
      const files = Array.from(event.target.files || [])
      const photos = [...props.value]
      for (const file of files) {
        const watermark = buildPhotoWatermark()
        photos.push({
          dataUrl: await fileToWatermarkedDataUrl(file, watermark),
          name: file.name,
          capturedAt: new Date().toISOString(),
          watermark,
        })
      }
      emit('change', photos)
      event.target.value = ''
    }
    async function replace(index, event) {
      const file = event.target.files?.[0]
      if (!file) return
      const watermark = buildPhotoWatermark()
      const photos = [...props.value]
      photos[index] = {
        dataUrl: await fileToWatermarkedDataUrl(file, watermark),
        name: file.name,
        capturedAt: new Date().toISOString(),
        watermark,
      }
      emit('change', photos)
      event.target.value = ''
    }
    function remove(index) {
      emit('change', props.value.filter((_, i) => i !== index))
    }
    return () => h('div', { class: 'm-form-group' }, [
      h('div', { class: 'm-form-label' }, [props.required ? h('span', { class: 'required' }, '*') : null, props.label]),
      props.value.length ? h('div', { class: 'file-list' }, props.value.map((photo, index) => h('div', { class: 'file-row' }, [
        h(props.disabled ? 'span' : 'label', { class: ['file-name', { 'clickable-name': !props.disabled }] }, [
          photo.name || `现场照片${index + 1}.jpg`,
          props.disabled ? null : h('input', { type: 'file', accept: 'image/*', onChange: event => replace(index, event) }),
        ]),
        h('span', { class: 'file-action' }, photo.watermark || '已加水印'),
        props.disabled ? null : h('button', { type: 'button', onClick: () => remove(index) }, '删除'),
      ]))) : null,
      props.disabled ? null : h('div', { class: 'camera-actions single' }, [
        h('label', { class: ['camera-button', 'primary', { error: props.error }] }, [
          h('span', null, '拍照'),
          h('input', { type: 'file', accept: 'image/*', capture: 'environment', multiple: true, onChange }),
        ]),
      ]),
      props.error ? h('div', { class: 'm-error' }, props.error) : null,
    ])
  },
})

const SignaturePad = defineComponent({
  props: {
    label: { type: String, default: '住宿单位负责人签字' },
    value: { type: String, default: '' },
    error: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['change'],
  setup(props, { emit }) {
    const canvasRef = ref(null)
    let drawing = false
    function point(event) {
      const canvas = canvasRef.value
      const rect = canvas.getBoundingClientRect()
      const source = event.touches?.[0] || event
      return { x: source.clientX - rect.left, y: source.clientY - rect.top }
    }
    function start(event) {
      if (props.disabled) return
      drawing = true
      const ctx = canvasRef.value.getContext('2d')
      const p = point(event)
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      event.preventDefault()
    }
    function move(event) {
      if (props.disabled || !drawing) return
      const ctx = canvasRef.value.getContext('2d')
      const p = point(event)
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#1f2937'
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      emit('change', canvasRef.value.toDataURL('image/png'))
      event.preventDefault()
    }
    function end() {
      drawing = false
      if (canvasRef.value) emit('change', canvasRef.value.toDataURL('image/png'))
    }
    function clear() {
      if (props.disabled) return
      const canvas = canvasRef.value
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      emit('change', '')
    }
    return () => h('div', { class: 'm-form-group' }, [
      h('div', { class: 'm-form-label' }, [h('span', { class: 'required' }, '*'), props.label]),
      props.value ? h('img', { class: 'signature-preview', src: props.value }) : null,
      h('div', { class: 'signature-wrap' }, [
        h('div', { class: 'signature-placeholder' }, '签字区域'),
        h('canvas', {
          ref: canvasRef,
          class: ['signature-pad', { error: props.error }],
          width: 640,
          height: 220,
          onMousedown: start,
          onMousemove: move,
          onMouseup: end,
          onMouseleave: end,
          onTouchstart: start,
          onTouchmove: move,
          onTouchend: end,
        }),
      ]),
      props.disabled ? null : h('div', { class: 'inline-actions' }, [h('button', { type: 'button', class: 'text-button', onClick: clear }, '重新签名')]),
      props.error ? h('div', { class: 'm-error' }, props.error) : null,
    ])
  },
})

const SubmitPreview = defineComponent({
  props: { form: { type: Object, required: true } },
  setup(props) {
    const rows = computed(() => COLLECTION_MODULES.filter(m => m.key !== 'PREVIEW').map(module => ({
      module,
      fields: (module.key === 'B' && shouldSkipBusinessModule(props.form) ? [] : getVisibleModuleFields(module, props.form))
        .map(key => ({ key, field: COLLECTION_FIELD_MAP[key], value: props.form[key] })),
    })).filter(group => group.fields.length > 0))
    function valueText(key, field, value) {
      if (key === 'location') return props.form.location ? (props.form.locationAddress || '当前位置已获取') : ''
      if (field.type === 'photo') return value ? (props.form.businessLicensePhotoName || '已上传图片') : '未上传'
      if (field.type === 'signature') return value ? '已签字' : '未签字'
      if (field.type === 'photos') return Array.isArray(value) && value.length ? value.map((photo, index) => photo.name || `现场照片${index + 1}.jpg`).join('、') : '未上传'
      if (['select', 'radio', 'checkbox'].includes(field.type)) return getOptionLabel(key, value)
      return value ?? ''
    }
    return () => h('div', { class: 'preview-list' }, rows.value.map(group => h('div', { class: 'preview-section' }, [
      h('div', { class: 'preview-title' }, `${group.module.key} ${group.module.title}`),
      ...group.fields.map(({ key, field, value }) => h('div', { class: 'preview-row' }, [
        h('span', { class: 'preview-key' }, `${field.label}：`),
        h('strong', null, valueText(key, field, value) || '-'),
      ])),
    ])))
  },
})
</script>

<style lang="scss" scoped>
.collection-entry {
  padding-bottom: 76px;
  touch-action: pan-y;
}

.unit-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.unit-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.unit-subtitle,
.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.module-card {
  padding-top: 14px;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef0f4;
}

.module-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.module-count {
  font-size: 13px;
  color: #606266;
}

.action-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: #eef6ff;
}

.panel-title {
  font-weight: 700;
  color: #1f2937;
}

.panel-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
}

.inline-actions,
.copy-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 8px;
}

.matched-text {
  font-size: 12px;
  color: #67c23a;
}

.ocr-alert {
  margin-bottom: 12px;
}

.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.radio-list,
.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.choice-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 24px;
  color: #303133;
  font-size: 15px;

  input {
    width: 18px;
    height: 18px;
    accent-color: #1a5fc5;
    flex: 0 0 auto;
  }
}

.upload-tile {
  height: 48px;
  flex: 1;
  border: 1px dashed #a8abb2;
  border-radius: 10px;
  color: #606266;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;

  &.error {
    border-color: #f56c6c;
  }

  input {
    display: none;
  }
}

.upload-actions,
.camera-actions {
  display: flex;
  gap: 10px;
}

.camera-actions.single {
  display: block;
}

.camera-button {
  height: 48px;
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  font-size: 15px;

  &.primary {
    color: #fff;
    background: #1a5fc5;
    border-color: #1a5fc5;
  }

  &.error {
    border-color: #f56c6c;
  }

  input {
    display: none;
  }
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 38px;
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;

  button {
    border: 0;
    background: transparent;
    color: #f56c6c;
    font-size: 12px;
    flex: 0 0 auto;
  }

  input {
    display: none;
  }
}

.file-row.clickable {
  cursor: pointer;
}

.file-name {
  min-width: 0;
  flex: 1;
  color: #1f2937;
  font-size: 13px;
  word-break: break-all;
}

.clickable-name {
  cursor: pointer;
}

.file-action {
  flex: 0 0 auto;
  color: #1a5fc5;
  font-size: 12px;
}

.signature-wrap {
  position: relative;
}

.signature-placeholder {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #c0c4cc;
  font-size: 18px;
  pointer-events: none;
}

.signature-pad {
  width: 100%;
  height: 150px;
  border: 1px dashed #a8abb2;
  border-radius: 10px;
  background: #fff;

  &.error {
    border-color: #f56c6c;
  }
}

.signature-preview {
  width: 100%;
  max-height: 80px;
  object-fit: contain;
  border-radius: 8px;
  background: #f8fafc;
  margin-bottom: 8px;
}

.text-button {
  border: 0;
  background: transparent;
  color: #1a5fc5;
  font-size: 13px;
}

.preview-section {
  padding: 10px 0;
  border-bottom: 1px solid #eef0f4;
}

.preview-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
}

.preview-row {
  display: grid;
  grid-template-columns: 44% 1fr;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;

  .preview-key {
    color: #000;
    font-weight: 600;
  }

  strong {
    color: #003f88;
    font-weight: 600;
    word-break: break-word;
  }
}

.drawer-search {
  padding: 0 4px 12px;
}

.unit-item {
  padding: 12px 4px;
  border-bottom: 1px solid #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &.selected {
    color: #1a5fc5;
  }
}

.unit-name {
  font-weight: 700;
}

.unit-address {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.m-input.has-error,
.m-select.has-error,
.m-textarea.has-error {
  border-color: #f56c6c;
}

.m-error {
  margin-top: 4px;
  font-size: 12px;
  color: #f56c6c;
}

.status-banner {
  margin: 8px 12px 0;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;

  &.offline {
    background: #fef0f0;
    color: #f56c6c;
  }

  &.syncing {
    background: #fdf6ec;
    color: #e6a23c;
  }
}
</style>
