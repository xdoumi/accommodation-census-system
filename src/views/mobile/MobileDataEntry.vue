<template>
  <div ref="rootRef" class="collection-entry table-entry">
    <div v-if="statusBanner" class="status-banner" :class="statusBanner.type">
      <el-icon><component :is="statusBanner.icon" /></el-icon>
      <span>{{ statusBanner.text }}</span>
    </div>

    <div v-if="isRejectedCurrentRecord" class="status-banner rejected">
      <el-icon><WarningFilled /></el-icon>
      <span>当前记录已被驳回：{{ currentRejectReason || '暂无驳回原因' }}</span>
    </div>

    <div v-if="readOnly" class="status-banner readonly">
      <el-icon><View /></el-icon>
      <span>当前记录已进入审核流程，仅可查看；草稿或县级驳回记录可继续编辑。</span>
    </div>

    <div class="entry-hero">
      <div class="hero-main">
        <div class="hero-kicker">移动端数据填报</div>
        <div class="unit-title">{{ form.operatingName || form.registeredName || form.unitName || '新增采集对象' }}</div>
        <div class="unit-subtitle">
          {{ selectedUnit ? '来自导入名录' : '可新增名单' }}
          <span v-if="form.sourceCatalogName"> · {{ form.sourceCatalogName }}</span>
        </div>
      </div>
      <div class="hero-progress" :class="{ done: totalProgress.percent === 100 }">
        <div class="progress-number">{{ totalProgress.percent }}%</div>
        <div class="progress-label">完成</div>
      </div>
      <div class="hero-meter">
        <span :style="{ width: `${totalProgress.percent}%` }" />
      </div>
      <div class="hero-meta">
        <span>{{ totalProgress.done }}/{{ totalProgress.total }} 必填</span>
        <span v-if="totalProgress.errorCount" class="meta-error">{{ totalProgress.errorCount }} 项待核对</span>
        <span v-else>{{ selectedUnit ? '名录匹配' : '新增填报' }}</span>
      </div>
    </div>

    <div class="module-anchor-bar">
      <button
        v-for="module in formModules"
        :key="module.key"
        type="button"
        class="module-anchor"
        :class="[moduleStatusClass(module), { active: activeModuleKey === module.key }]"
        :aria-label="`跳转到${module.key} ${module.title}`"
        :aria-current="activeModuleKey === module.key ? 'true' : 'false'"
        @click="scrollToModule(module.key)"
      >
        <span>{{ module.key }}</span>
        <b>{{ module.title }}</b>
      </button>
      <button
        type="button"
        class="module-anchor preview-link"
        aria-label="进入提交预览"
        @click="handleSubmit"
      >
        预览
      </button>
    </div>

    <div
      v-for="module in formModules"
      :key="module.key"
      :ref="el => setModuleRef(module.key, el)"
      class="m-card module-card module-section"
    >
      <div class="module-header">
        <div class="module-heading">
          <div class="module-title-row">
            <span class="module-code">{{ module.key }}</span>
            <div class="module-title">{{ module.title }}</div>
          </div>
          <div class="module-progress">{{ moduleCompletionText(module) }}</div>
        </div>
        <div v-if="moduleHasError(module)" class="module-error-badge">待补充</div>
        <div v-else-if="moduleRequiredStats(module).percent === 100" class="module-done-badge">已完成</div>
      </div>
      <div class="module-meter">
        <span :style="{ width: `${moduleRequiredStats(module).percent}%` }" />
      </div>

      <template v-if="module.key === 'A'">
        <div class="action-panel" data-field-key="location" :class="{ 'has-error': errors.location }">
          <div>
            <div class="panel-title"><span class="required">*</span>A1 定位坐标</div>
            <div class="location-grid" v-if="form.location">
              <div>
                <span>当前位置地址</span>
                <strong>{{ form.locationAddress || currentAddressDescription() }}</strong>
              </div>
              <div>
                <span>经纬度</span>
                <strong>{{ coordinateText }}</strong>
              </div>
            </div>
            <div v-else class="panel-desc">{{ locationText }}</div>
          </div>
          <el-button type="primary" size="small" :loading="locating" :disabled="readOnly" @click="captureLocation">定位</el-button>
        </div>
        <div v-if="errors.location" class="m-error location-error">{{ errors.location }}</div>

        <div class="m-form-group" data-field-key="unitName">
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

      <template v-else-if="module.key === 'B'">
        <PhotoPicker
          field-key="businessLicensePhoto"
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
        <DivisionCodePicker
          address-field-key="registeredAddress"
          address-label="区划地址"
          address-code="B8"
          code-field-key="registeredDivisionCode"
          code-label="区划代码（12位）"
          code-code="B9"
          prefix="registeredDivision"
          :form="form"
          :errors="errors"
          :disabled="readOnly"
          :areas="areaStore.areas"
        />
        <FieldControl field-key="legalRepresentative" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="legalRepresentativePhone" :form="form" :errors="errors" :disabled="readOnly" />
      </template>

      <template v-else-if="module.key === 'C'">
        <div class="copy-row">
          <el-checkbox v-model="sameAsRegisteredName" :disabled="readOnly" @change="syncRegisteredName">经营单位名称同注册名</el-checkbox>
          <el-checkbox v-model="sameAsRegisteredAddress" :disabled="readOnly" @change="syncRegisteredAddress">实际地址同注册地址</el-checkbox>
        </div>
        <FieldControl field-key="operatingName" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="actualOperatingStatus" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="actualAddress" :form="form" :errors="errors" :disabled="readOnly" />
        <DivisionCodePicker
          address-field-key="actualAddress"
          address-label="实际经营区划地址"
          address-code="C4"
          code-field-key="divisionCode"
          code-label="实际经营区划代码（12位）"
          code-code="C5"
          prefix="division"
          :form="form"
          :errors="errors"
          :disabled="readOnly"
          :areas="areaStore.areas"
        />
        <FieldControl field-key="contactName" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="contactPhone" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="economyIndustryCode" :form="form" :errors="errors" :disabled="readOnly" @industry-change="syncIndustryCode" />
        <FieldControl field-key="isStarIndustryCode" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="ratingLevel" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="stateHolding" :form="form" :errors="errors" :disabled="readOnly" />
      </template>

      <template v-else-if="module.key === 'D'">
        <FieldControl field-key="buildingOwnership" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl field-key="businessMode" :form="form" :errors="errors" :disabled="readOnly" />
        <FieldControl
          v-if="['seasonal', 'reservation', 'mixed', 'other'].includes(form.businessMode)"
          field-key="businessModeRemark"
          :form="form"
          :errors="errors"
          :disabled="readOnly"
        />
        <div class="two-cols">
          <FieldControl field-key="rooms" :form="form" :errors="errors" :disabled="readOnly" />
          <FieldControl field-key="beds" :form="form" :errors="errors" :disabled="readOnly" />
        </div>
        <div class="two-cols">
          <FieldControl field-key="staffCount" :form="form" :errors="errors" :disabled="readOnly" />
          <FieldControl field-key="subjectType" :form="form" :errors="errors" :disabled="readOnly" />
        </div>
      </template>

      <template v-else-if="module.key === 'E'">
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

      <template v-else-if="module.key === 'F'">
        <FieldControl field-key="otaPlatforms" :form="form" :errors="errors" :disabled="readOnly" @ota-change="handleOtaChange" />
        <FieldControl v-if="form.otaPlatforms.includes('other')" field-key="otaOther" :form="form" :errors="errors" :disabled="readOnly" />
      </template>

      <template v-else-if="module.key === 'G'">
        <MultiPhotoPicker
          field-key="storefrontPhotos"
          label="住宿单位门头照"
          :required="true"
          :value="form.storefrontPhotos"
          :error="errors.storefrontPhotos"
          :disabled="readOnly"
          @change="value => form.storefrontPhotos = value"
        />
        <MultiPhotoPicker
          field-key="groupPhotos"
          label="核查人员与门头合影"
          :required="true"
          :value="form.groupPhotos"
          :error="errors.groupPhotos"
          :disabled="readOnly"
          @change="value => form.groupPhotos = value"
        />
      </template>
    </div>

    <div class="m-bottom-bar">
      <el-button v-if="!readOnly" class="draft-action" @click="saveDraft">保存草稿</el-button>
      <el-button v-if="!readOnly" class="submit-action" type="primary" :loading="submitting" @click="handleSubmit">提交预览</el-button>
      <el-button v-if="readOnly" type="primary" @click="router.push('/m/units')">返回清单</el-button>
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
          <div class="unit-address">来源：{{ getOptionLabel('catalogSource', unit.catalogSource) || '未设置' }} · 核查类型：{{ getOptionLabel('checkType', unit.checkType) || '未设置' }}</div>
        </div>
        <el-icon v-if="selectedUnit?.id === unit.id" color="#1a5fc5"><Check /></el-icon>
      </div>
      <div v-if="filteredUnits.length === 0" class="empty-unit">
        <el-empty description="未找到匹配单位" />
        <el-button type="primary" :disabled="!unitSearch.trim()" @click="useSearchAsUnitName">使用搜索内容作为单位名称</el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  COLLECTION_FIELD_MAP,
  COLLECTION_MODULES,
  INDUSTRY_OPTIONS,
  buildCollectionFormFromUnit,
  createEmptyCollectionForm,
  getVisibleModuleFields,
  getOptionLabel,
  inferStarIndustryFlag,
  isFieldVisible,
  isFieldRequired,
  shouldSkipBusinessModule,
} from '@/utils/collectionSpec'
import { useCensusStore } from '@/stores/census'
import { useAreaStore } from '@/stores/area'
import { useOfflineQueue } from '@/composables/useOfflineQueue'
import db from '@/db'
import { buildDivisionCode, getStreetOptions, GUIZHOU_PROVINCE_CODE, GUIZHOU_PROVINCE_NAME, splitDivisionCode } from '@/utils/divisionHelper'
import { buildMobileSubmitContextKey, saveMobileSubmitContext } from '@/utils/mobileSubmitContext'
import { INITIAL_REVIEW_STATUS, normalizeRecordStatus } from '@/utils/reviewFlow'

const route = useRoute()
const router = useRouter()
const censusStore = useCensusStore()
const areaStore = useAreaStore()
const offlineQueue = useOfflineQueue()

const rootRef = ref(null)
const moduleRefs = new Map()
const activeModuleKey = ref('A')
const form = reactive(createEmptyCollectionForm())
const errors = ref({})
const units = ref([])
const selectedUnit = ref(null)
const currentRecord = ref(null)
const showUnitPicker = ref(false)
const unitSearch = ref('')
const submitting = ref(false)
const locating = ref(false)
const sameAsRegisteredName = ref(false)
const sameAsRegisteredAddress = ref(false)
const editingRecordId = ref(route.query.recordId ? Number(route.query.recordId) : null)
const readOnly = ref(false)
let scrollContainer = null

const formModules = computed(() => COLLECTION_MODULES.filter(module => !['PREVIEW', 'SIGN'].includes(module.key) && visibleFields(module).length > 0))
const draftKey = computed(() => `collection_form_${route.params.taskId}_${route.params.assignmentId || 'global'}_${selectedUnit.value?.id || form.creditCode || form.unitName || 'new'}`)
const submitContextKey = computed(() => buildMobileSubmitContextKey(
  route.params.taskId,
  route.params.assignmentId || 0,
  editingRecordId.value || selectedUnit.value?.id || form.creditCode || form.unitName || 'new',
))
const totalProgress = computed(() => {
  const fields = formModules.value.flatMap(module => visibleFields(module).filter(key => isFieldRequired(key, form)))
  const done = fields.filter(key => isValidRequiredValue(key)).length
  const total = fields.length
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 100,
    errorCount: Object.keys(errors.value).length,
  }
})

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

const coordinateText = computed(() => {
  if (!form.location) return ''
  return `${Number(form.location.longitude).toFixed(6)}, ${Number(form.location.latitude).toFixed(6)}`
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
const isRejectedCurrentRecord = computed(() => ['county_rejected', 'city_rejected', 'province_rejected'].includes(normalizeRecordStatus(currentRecord.value?.status)))
const currentRejectReason = computed(() => currentRecord.value?.rejectReason || currentRecord.value?.reviewComment || '')

onMounted(async () => {
  offlineQueue.start()
  await nextTick()
  scrollContainer = rootRef.value?.closest('.mobile-content') || document.querySelector('.mobile-content') || window
  scrollContainer.addEventListener('scroll', handleScrollActiveModule, { passive: true })
  handleScrollActiveModule()
  await areaStore.fetchAreas()
  await censusStore.fetchTaskDetail(route.params.taskId)
  await loadUnits()
  if (editingRecordId.value) await restoreRecord(editingRecordId.value)
  else await applyInitialRouteSelection()
  if (!form.location) captureLocation(false)
  await nextTick()
  handleScrollActiveModule()
})

onBeforeUnmount(() => {
  scrollContainer?.removeEventListener('scroll', handleScrollActiveModule)
})

watch(form, () => {
  if (readOnly.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveLocalDraft, 700)
}, { deep: true })

watch(() => form.licenseType, async value => {
  if (!['no_license', 'other'].includes(value)) return
  const businessKeys = COLLECTION_MODULES.find(module => module.key === 'B')?.fields || []
  const nextErrors = { ...errors.value }
  businessKeys.forEach(key => delete nextErrors[key])
  errors.value = nextErrors
  await nextTick()
  scrollToModule('C')
})

watch(() => form.economyIndustryCode, value => {
  const next = inferStarIndustryFlag(value)
  if (form.isStarIndustryCode !== next) form.isStarIndustryCode = next
})

let saveTimer = null

async function loadUnits() {
  const assignmentId = route.params.assignmentId
  if (assignmentId) {
    const assignment = censusStore.assignments.find(a => a.id === Number(assignmentId))
    if (assignment) {
      const targetIds = parseArray(assignment.targetAccommodationIds).map(Number).filter(Boolean)
      if (targetIds.length) {
        const targetUnits = []
        for (const id of targetIds) {
          const unit = await db.accommodations.get(id)
          if (unit && !unit.deletedAt) targetUnits.push(unit)
        }
        units.value = targetUnits
        return
      }
      units.value = (await db.accommodations.where('countyCode').equals(assignment.areaCode).toArray()).filter(item => !item.deletedAt)
      if (units.value.length === 0) {
        units.value = (await db.accommodations.where('cityCode').equals(assignment.areaCode).toArray()).filter(item => !item.deletedAt)
      }
      return
    }
  }
  units.value = (await db.accommodations.toArray()).filter(item => !item.deletedAt)
}

async function applyInitialRouteSelection() {
  const unitId = Number(route.query.unitId || 0)
  const unitName = String(route.query.unitName || '').trim()
  if (unitId) {
    const unit = units.value.find(item => Number(item.id) === unitId)
    if (unit) {
      applySelectedUnit(unit, { silent: true, restoreDraft: true })
      return
    }
  }
  if (unitName) {
    form.unitName = unitName
    if (!form.operatingName) form.operatingName = unitName
  }
}

function parseArray(raw) {
  try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
}

function selectUnit(unit) {
  applySelectedUnit(unit, { silent: false, restoreDraft: true })
  showUnitPicker.value = false
}

function applySelectedUnit(unit, { silent = false, restoreDraft = true } = {}) {
  const currentForm = { ...form }
  const unitForm = buildCollectionFormFromUnit(unit)
  selectedUnit.value = unit
  editingRecordId.value = null
  Object.assign(form, unitForm)
  clearOcrBusinessFields()
  fillMissingFormValues(form, currentForm)
  const restored = restoreDraft ? restoreLocalDraft() : false
  if (restored) {
    fillMissingFormValues(form, unitForm)
    if (!silent) ElMessage.success('已恢复该单位草稿，并补全名录已有字段')
  } else if (!silent) {
    ElMessage.success('已回写名录已有字段')
  }
}

function clearOcrBusinessFields() {
  ;[
    'registeredName',
    'creditCode',
    'registrationAuthority',
    'registrationAuthorityOther',
    'registeredAddress',
    'registeredDivisionAddress',
    'registeredDivisionCode',
    'legalRepresentative',
  ].forEach(key => { form[key] = createEmptyCollectionForm()[key] })
}

function useSearchAsUnitName() {
  const keyword = unitSearch.value.trim()
  if (!keyword) return
  selectedUnit.value = null
  form.unitName = keyword
  if (!form.operatingName) form.operatingName = keyword
  showUnitPicker.value = false
  ElMessage.success('已将搜索内容填入单位名称')
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
  currentRecord.value = record
  readOnly.value = route.query.mode === 'view' || !canEditRecord(record)
  if (record.formData) {
    try { Object.assign(form, createEmptyCollectionForm(), JSON.parse(record.formData)) } catch { /* ignore */ }
  }
  selectedUnit.value = units.value.find(u => u.id === record.accommodationId) || null
  activeModuleKey.value = 'A'
  ElMessage.success(readOnly.value ? '已打开单位填报记录' : '已打开单位填报记录，可继续修改')
}

function canEditRecord(record) {
  return ['draft', 'county_rejected'].includes(normalizeRecordStatus(record?.status))
}

function saveLocalDraft() {
  try {
    localStorage.setItem(draftKey.value, JSON.stringify({
      form: { ...form },
      selectedUnitId: selectedUnit.value?.id || null,
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
  form.registeredName = source.registeredName || source.name || form.unitName || ''
  form.creditCode = source.creditCode || ''
  form.registrationAuthority = source.registrationAuthority || 'market'
  form.registrationDate ||= source.openDate || new Date().toISOString().slice(0, 10)
  form.registeredAddress = source.registeredAddress || source.detailAddress || form.locationAddress || ''
  applyDivisionFromAddress('registeredDivision', 'registeredAddress', 'registeredDivisionCode')
  form.legalRepresentative = source.legalRepresentative || ''
  form.legalRepresentativePhone ||= source.legalRepresentativePhone || ''
  ElMessage.success('已按营业执照照片模拟识别回填，请逐项核对')
}

function syncRegisteredName() {
  if (sameAsRegisteredName.value) form.operatingName = form.registeredName
}

function currentAddressDescription() {
  return selectedUnit.value?.detailAddress || form.actualAddress || form.registeredAddress || '贵阳市云岩区北京路12号贵旅大厦'
}

function syncRegisteredAddress() {
  if (sameAsRegisteredAddress.value) {
    form.actualAddress = form.registeredAddress
    copyRegisteredDivisionToActual()
  }
}

function applyDivisionFromAddress(prefix, addressKey, codeKey) {
  const inferred = inferDivisionFromAddress(form[addressKey], areaStore.areas)
  form[`${prefix}ProvinceCode`] = inferred.provinceCode
  form[`${prefix}CityCode`] = inferred.cityCode
  form[`${prefix}CountyCode`] = inferred.countyCode
  form[`${prefix}StreetCode`] = inferred.streetCode || form[`${prefix}StreetCode`] || '999'
  form[`${prefix}StreetName`] = inferred.streetName || form[`${prefix}StreetName`]
  form[codeKey] = buildDivisionCode(form[`${prefix}CountyCode`], form[`${prefix}StreetCode`] || '999')
  form[prefix === 'division' ? 'actualDivisionAddress' : 'registeredDivisionAddress'] = formatDivisionAddressFromForm(prefix)
}

function copyRegisteredDivisionToActual() {
  form.actualDivisionAddress = form.registeredDivisionAddress
  form.divisionCode = form.registeredDivisionCode
  form.divisionProvinceCode = form.registeredDivisionProvinceCode
  form.divisionCityCode = form.registeredDivisionCityCode
  form.divisionCountyCode = form.registeredDivisionCountyCode
  form.divisionStreetCode = form.registeredDivisionStreetCode
  form.divisionStreetName = form.registeredDivisionStreetName
}

function areaName(code) {
  return areaStore.getAreaName(code) || ''
}

function formatDivisionAddressFromForm(prefix) {
  const province = GUIZHOU_PROVINCE_NAME
  const city = areaName(form[`${prefix}CityCode`])
  const county = areaName(form[`${prefix}CountyCode`])
  const street = form[`${prefix}StreetName`] || getStreetOptions(form[`${prefix}CountyCode`]).find(item => item.code === form[`${prefix}StreetCode`])?.name || ''
  return [province, city, county, street].filter(Boolean).join(' / ')
}

function syncIndustryCode(value) {
  form.economyIndustryCode = value
  form.isStarIndustryCode = inferStarIndustryFlag(value)
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

function setModuleRef(key, el) {
  if (el) moduleRefs.set(key, el)
}

function scrollToModule(key) {
  activeModuleKey.value = key
  moduleRefs.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  window.setTimeout(handleScrollActiveModule, 280)
}

function handleScrollActiveModule() {
  let current = activeModuleKey.value
  let bestTop = Number.NEGATIVE_INFINITY
  const containerTop = scrollContainer && scrollContainer !== window ? scrollContainer.getBoundingClientRect().top : 0
  const activationTop = containerTop + 116
  for (const [key, el] of moduleRefs.entries()) {
    const top = el.getBoundingClientRect().top
    if (top <= activationTop && top > bestTop) {
      bestTop = top
      current = key
    }
  }
  activeModuleKey.value = current
}

function scrollToFirstError() {
  const firstErrorKey = Object.keys(errors.value)[0]
  if (!firstErrorKey) return
  const target = rootRef.value?.querySelector(`[data-field-key="${firstErrorKey}"]`)
  if (target) {
    target.scrollIntoView({ behavior: 'auto', block: 'center' })
    window.setTimeout(() => {
      target.querySelector('input, select, textarea, button')?.focus?.()
      handleScrollActiveModule()
    }, 40)
    return
  }
  const module = formModules.value.find(item => item.fields.includes(firstErrorKey))
  if (module) scrollToModule(module.key)
}

function moduleHasError(module) {
  return visibleFields(module).some(key => errors.value[key])
}

function moduleCompletionText(module) {
  const stats = moduleRequiredStats(module)
  if (!stats.total) return '无必填项'
  return `必填 ${stats.done}/${stats.total}`
}

function moduleRequiredStats(module) {
  const fields = visibleFields(module).filter(key => isFieldRequired(key, form))
  const done = fields.filter(key => isValidRequiredValue(key)).length
  return {
    done,
    total: fields.length,
    percent: fields.length ? Math.round((done / fields.length) * 100) : 100,
  }
}

function moduleStatusClass(module) {
  if (moduleHasError(module)) return 'error'
  const stats = moduleRequiredStats(module)
  if (stats.total && stats.percent === 100) return 'done'
  return ''
}

function isValidRequiredValue(key) {
  const field = COLLECTION_FIELD_MAP[key]
  const value = form[key]
  if (!field || !isFieldRequired(key, form)) return true
  if (field.type === 'location') return Boolean(form.location)
  if (field.type === 'checkbox') return Array.isArray(value) && value.length > 0
  if (field.type === 'photos') return Array.isArray(value) && value.length > 0
  if (['photo', 'signature'].includes(field.type)) return Boolean(value)
  if (value === '' || value === null || value === undefined) return false
  if (field.pattern) return field.pattern.test(String(value))
  return true
}

function validateModule(module) {
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
  for (const module of formModules.value) validateModule(module)
  return Object.keys(errors.value).length === 0
}

async function saveDraft() {
  if (readOnly.value) return
  saveLocalDraft()
  await saveRecord('draft')
  ElMessage.success('草稿已保存')
}

async function handleSubmit() {
  if (readOnly.value) {
    ElMessage.warning('当前记录已进入审核流程，仅可查看，不能提交预览')
    return
  }
  if (!validateAll()) {
    ElMessage.error('存在未完成字段，请核对后提交')
    scrollToFirstError()
    return
  }
  saveLocalDraft()
  saveMobileSubmitContext(submitContextKey.value, {
    taskId: Number(route.params.taskId),
    assignmentId: route.params.assignmentId ? Number(route.params.assignmentId) : 0,
    selectedUnitId: selectedUnit.value?.id || null,
    editingRecordId: editingRecordId.value || null,
    draftKey: draftKey.value,
    form: { ...form },
  })
  router.push({
    path: `/m/entry/${route.params.taskId}/${route.params.assignmentId || 0}/preview`,
    query: { ctx: submitContextKey.value },
  })
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
            disabled: props.disabled || props.fieldKey === 'isStarIndustryCode',
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
      return h('div', { class: 'm-form-group', 'data-field-key': props.fieldKey }, [
        label,
        control,
        props.errors[props.fieldKey] ? h('div', { class: 'm-error' }, props.errors[props.fieldKey]) : null,
      ])
    }
  },
})

const DivisionCodePicker = defineComponent({
  props: {
    prefix: { type: String, required: true },
    addressFieldKey: { type: String, required: true },
    addressLabel: { type: String, required: true },
    addressCode: { type: String, required: true },
    codeFieldKey: { type: String, required: true },
    codeLabel: { type: String, required: true },
    codeCode: { type: String, required: true },
    form: { type: Object, required: true },
    errors: { type: Object, required: true },
    disabled: { type: Boolean, default: false },
    areas: { type: Array, default: () => [] },
  },
  setup(props) {
    const pickerVisible = ref(false)
    const pickerLevel = ref('city')
    const provinceKey = computed(() => `${props.prefix}ProvinceCode`)
    const cityKey = computed(() => `${props.prefix}CityCode`)
    const countyKey = computed(() => `${props.prefix}CountyCode`)
    const streetCodeKey = computed(() => `${props.prefix}StreetCode`)
    const streetNameKey = computed(() => `${props.prefix}StreetName`)
    const divisionAddressKey = computed(() => props.prefix === 'division' ? 'actualDivisionAddress' : `${props.prefix}Address`)
    const cities = computed(() => props.areas.filter(area => area.level === 2 && area.parentCode === GUIZHOU_PROVINCE_CODE))
    const counties = computed(() => props.areas.filter(area => area.level === 3 && area.parentCode === props.form[cityKey.value]))
    const streets = computed(() => getStreetOptions(props.form[countyKey.value]))
    const currentCity = computed(() => props.areas.find(area => area.code === props.form[cityKey.value]))
    const currentCounty = computed(() => props.areas.find(area => area.code === props.form[countyKey.value]))
    const currentStreet = computed(() => streets.value.find(item => item.code === props.form[streetCodeKey.value]))
    const divisionAddress = computed(() => {
      const province = GUIZHOU_PROVINCE_NAME
      const city = currentCity.value?.name || ''
      const county = currentCounty.value?.name || ''
      const street = props.form[streetNameKey.value] || currentStreet.value?.name || ''
      return [province, city, county, street].filter(Boolean).join(' / ')
    })
    const selectedPath = computed(() => [
      { level: 'city', label: GUIZHOU_PROVINCE_NAME, selected: true, available: true },
      { level: 'city', label: currentCity.value?.name || '请选择市州', selected: !!currentCity.value, available: true },
      { level: 'county', label: currentCounty.value?.name || '请选择区县', selected: !!currentCounty.value, available: !!currentCity.value },
      { level: 'street', label: props.form[streetNameKey.value] || currentStreet.value?.name || '请选择街道/乡镇', selected: !!(props.form[streetNameKey.value] || currentStreet.value), available: !!currentCounty.value },
    ])
    const currentOptions = computed(() => {
      if (pickerLevel.value === 'city') return cities.value.map(area => ({ code: area.code, name: area.name, type: 'area' }))
      if (pickerLevel.value === 'county') return counties.value.map(area => ({ code: area.code, name: area.name, type: 'area' }))
      return [
        ...streets.value.map(item => ({ code: item.code, name: item.name, type: 'street' })),
        { code: '__none__', name: '暂不选择', type: 'empty' },
      ]
    })
    const pickerHint = computed(() => {
      if (pickerLevel.value === 'city') return '选择市州'
      if (pickerLevel.value === 'county') return '选择区县'
      return '选择街道/乡镇'
    })

    watch(() => props.form[props.codeFieldKey], value => {
      if (!value || props.form[countyKey.value]) return
      const parsed = splitDivisionCode(value)
      if (!parsed.countyCode) return
      const county = props.areas.find(area => area.code === parsed.countyCode)
      props.form[countyKey.value] = parsed.countyCode
      props.form[cityKey.value] = county?.parentCode || ''
      props.form[provinceKey.value] = GUIZHOU_PROVINCE_CODE
      props.form[streetCodeKey.value] = parsed.streetCode || ''
      props.form[streetNameKey.value] = streets.value.find(item => item.code === parsed.streetCode)?.name || props.form[streetNameKey.value] || ''
      syncDivisionAddress()
    }, { immediate: true })

    watch(divisionAddress, syncDivisionAddress)

    function openPicker() {
      if (props.disabled) return
      if (!props.form[cityKey.value]) pickerLevel.value = 'city'
      else if (!props.form[countyKey.value]) pickerLevel.value = 'county'
      else pickerLevel.value = 'street'
      pickerVisible.value = true
    }

    function resetAfterCity() {
      props.form[countyKey.value] = ''
      props.form[streetCodeKey.value] = ''
      props.form[streetNameKey.value] = ''
      props.form[props.codeFieldKey] = ''
      syncDivisionAddress()
    }

    function resetAfterCounty() {
      props.form[streetCodeKey.value] = ''
      props.form[streetNameKey.value] = ''
      props.form[props.codeFieldKey] = ''
      syncDivisionAddress()
    }

    function goLevel(level) {
      if (props.disabled) return
      if (level === 'county' && !props.form[cityKey.value]) return
      if (level === 'street' && !props.form[countyKey.value]) return
      pickerLevel.value = level
    }

    function selectOption(option) {
      if (pickerLevel.value === 'city') {
        props.form[cityKey.value] = option.code
        resetAfterCity()
        pickerLevel.value = 'county'
        return
      }
      if (pickerLevel.value === 'county') {
        props.form[countyKey.value] = option.code
        resetAfterCounty()
        pickerLevel.value = 'street'
        return
      }
      if (option.code === '__none__') {
        props.form[streetCodeKey.value] = ''
        props.form[streetNameKey.value] = ''
      } else {
        props.form[streetCodeKey.value] = option.code
        props.form[streetNameKey.value] = option.name
      }
      generate()
      pickerVisible.value = false
    }

    function generate() {
      props.form[props.codeFieldKey] = buildDivisionCode(props.form[countyKey.value], props.form[streetCodeKey.value] || '999')
      syncDivisionAddress()
    }

    function syncDivisionAddress() {
      props.form[divisionAddressKey.value] = divisionAddress.value
    }

    function isSelectedOption(option) {
      if (pickerLevel.value === 'city') return option.code === props.form[cityKey.value]
      if (pickerLevel.value === 'county') return option.code === props.form[countyKey.value]
      if (option.code === '__none__') return props.form[countyKey.value] && !props.form[streetCodeKey.value]
      return option.code === props.form[streetCodeKey.value]
    }

    function initialForName(name) {
      const first = String(name || '').trim().charAt(0)
      const map = {
        安: 'A',
        白: 'B',
        毕: 'B',
        碧: 'B',
        北: 'B',
        大: 'D',
        都: 'D',
        龚: 'G',
        贵: 'G',
        黄: 'H',
        花: 'H',
        凯: 'K',
        六: 'L',
        麦: 'M',
        牛: 'N',
        黔: 'Q',
        泉: 'Q',
        人: 'R',
        沙: 'S',
        市: 'S',
        铜: 'T',
        万: 'W',
        文: 'W',
        新: 'X',
        延: 'Y',
        艳: 'Y',
        云: 'Y',
        遵: 'Z',
        中: 'Z',
      }
      return map[first] || ''
    }

    return () => h('div', { class: 'm-form-group division-picker', 'data-field-key': divisionAddressKey.value }, [
      h('div', { class: 'm-form-label' }, [h('span', { class: 'required' }, '*'), `${props.addressCode} ${props.addressLabel}`]),
      h('button', {
        type: 'button',
        class: ['division-select-card', { 'has-error': props.errors[divisionAddressKey.value] }],
        disabled: props.disabled,
        onClick: openPicker,
      }, [
        h('span', { class: ['division-select-text', { placeholder: !props.form[divisionAddressKey.value] }] }, props.form[divisionAddressKey.value] || '请选择省 / 市州 / 区县 / 街道'),
        h('span', { class: 'division-select-arrow' }, '›'),
      ]),
      h('div', { class: 'm-form-label division-code-label' }, [h('span', { class: 'required' }, '*'), `${props.codeCode} ${props.codeLabel}`]),
      h('div', { class: 'division-code-row', 'data-field-key': props.codeFieldKey }, [
        h('input', {
          class: ['m-input', { 'has-error': props.errors[props.codeFieldKey] }],
          value: props.form[props.codeFieldKey],
          disabled: props.disabled,
          placeholder: '确认区划地址后自动生成',
          onInput: event => { props.form[props.codeFieldKey] = event.target.value },
        }),
      ]),
      pickerVisible.value ? h('div', { class: 'division-sheet-mask', onClick: () => { pickerVisible.value = false } }, [
        h('div', { class: 'division-sheet', onClick: event => event.stopPropagation() }, [
          h('div', { class: 'division-sheet-header' }, [
            h('div', { class: 'division-sheet-title' }, '请选择所在地区'),
            h('button', {
              type: 'button',
              class: 'division-sheet-close',
              'aria-label': '关闭地区选择',
              onClick: () => { pickerVisible.value = false },
            }, '×'),
          ]),
          h('div', { class: 'division-path' }, selectedPath.value.map((item, index) => h('button', {
            type: 'button',
            class: ['division-path-item', { active: item.level === pickerLevel.value, selected: item.selected, disabled: !item.available }],
            disabled: !item.available,
            onClick: () => goLevel(item.level),
          }, [
            h('span', { class: 'division-path-dot' }),
            h('span', { class: 'division-path-label' }, item.label),
            index > 0 ? h('span', { class: 'division-path-chevron' }, '›') : null,
          ]))),
          h('div', { class: 'division-option-header' }, pickerHint.value),
          h('div', { class: 'division-option-list' }, currentOptions.value.map(option => {
            const selected = isSelectedOption(option)
            return h('button', {
              type: 'button',
              class: ['division-option', { selected, empty: option.code === '__none__' }],
              onClick: () => selectOption(option),
            }, [
              h('span', { class: 'division-option-index' }, option.code === '__none__' ? '' : initialForName(option.name)),
              h('span', { class: 'division-option-name' }, option.name),
              selected ? h('span', { class: 'division-option-check' }, '✓') : null,
            ])
          })),
        ]),
      ]) : null,
      props.errors[divisionAddressKey.value] ? h('div', { class: 'm-error' }, props.errors[divisionAddressKey.value]) : null,
      props.errors[props.codeFieldKey] ? h('div', { class: 'm-error' }, props.errors[props.codeFieldKey]) : null,
    ])
  },
})

const PhotoPicker = defineComponent({
  props: {
    fieldKey: { type: String, default: '' },
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
    return () => h('div', { class: 'm-form-group', 'data-field-key': props.fieldKey }, [
      h('div', { class: 'm-form-label' }, [props.required ? h('span', { class: 'required' }, '*') : null, props.label]),
      props.value
        ? h(props.disabled ? 'div' : 'label', { class: ['file-row', { clickable: !props.disabled }] }, [
          h('span', { class: 'file-name' }, props.fileName || '已上传图片'),
          props.disabled ? null : h('span', { class: 'file-action' }, '点击重传/拍照'),
          props.disabled ? null : h('input', { type: 'file', accept: 'image/*', onChange }),
        ])
        : h('div', { class: 'camera-actions' }, [
          h('label', { class: ['camera-button', 'primary', { error: props.error, disabled: props.disabled }] }, [
            h('span', null, '拍摄'),
            props.disabled ? null : h('input', { type: 'file', accept: 'image/*', capture: 'environment', onChange }),
          ]),
          h('label', { class: ['camera-button', { error: props.error, disabled: props.disabled }] }, [
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
    fieldKey: { type: String, default: '' },
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
    return () => h('div', { class: 'm-form-group', 'data-field-key': props.fieldKey }, [
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
</script>

<style lang="scss" scoped>
.collection-entry {
  min-height: 100%;
  padding-bottom: 98px;
  touch-action: pan-y;
  background:
    linear-gradient(180deg, #eef5ff 0, #f5f6fa 210px),
    #f5f6fa;
}

.table-entry {
  padding-top: 1px;
}

.entry-hero {
  position: relative;
  margin: 10px 12px 8px;
  padding: 16px;
  border: 1px solid rgba(26, 95, 197, 0.1);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(26, 95, 197, 0.08);
}

.hero-main {
  padding-right: 82px;
}

.hero-kicker {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #1a5fc5;
}

.hero-progress {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: 4px solid #d8e8ff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8fbff;
  color: #1a5fc5;

  &.done {
    border-color: #67c23a;
    color: #2f8f4e;
  }
}

.progress-number {
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
}

.progress-label {
  margin-top: 3px;
  font-size: 10px;
}

.hero-meter,
.module-meter {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf1f7;

  span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #1a5fc5, #35a2ff);
    transition: width 0.25s ease;
  }
}

.hero-meter {
  margin-top: 14px;
}

.hero-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}

.meta-error {
  color: #f56c6c;
  font-weight: 700;
}

.module-anchor-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  gap: 9px;
  margin: 0;
  padding: 10px 12px 11px;
  overflow-x: auto;
  background: rgba(245, 246, 250, 0.96);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #eef0f4;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.module-anchor {
  flex: 0 0 auto;
  min-width: 96px;
  height: 44px;
  padding: 0 13px;
  border: 1px solid #dcdfe6;
  border-radius: 20px;
  background: #fff;
  color: #606266;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(31, 41, 55, 0.04);
  touch-action: manipulation;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease;

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 5px;
    border-radius: 50%;
    background: #edf5ff;
    color: #1a5fc5;
    font-size: 11px;
    font-weight: 800;
  }

  b {
    font-weight: 700;
  }

  &.active {
    color: #fff;
    background: #1a5fc5;
    border-color: #1a5fc5;

    span {
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
    }
  }

  &.done:not(.active) {
    color: #2f8f4e;
    border-color: #bde8ca;
    background: #f2fbf5;

    span {
      color: #2f8f4e;
      background: #dff5e6;
    }
  }

  &.error {
    border-color: #f56c6c;
    color: #f56c6c;

    span {
      color: #f56c6c;
      background: #fef0f0;
    }
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 3px solid rgba(26, 95, 197, 0.22);
    outline-offset: 2px;
  }
}

.unit-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.35;
}

.unit-subtitle,
.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.module-card {
  padding: 16px 14px 14px;
  border: 1px solid #eef0f4;
  box-shadow: 0 6px 18px rgba(31, 41, 55, 0.05);
}

.module-section {
  scroll-margin-top: 68px;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.module-title-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.module-code {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #1a5fc5;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(26, 95, 197, 0.18);
}

.module-title {
  font-size: 17px;
  font-weight: 700;
  color: #1f2937;
}

.module-progress {
  margin-top: 4px;
  font-size: 13px;
  color: #606266;
}

.module-error-badge {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  background: #fef0f0;
  color: #f56c6c;
  font-size: 12px;
  font-weight: 600;
}

.module-done-badge {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  background: #f2fbf5;
  color: #2f8f4e;
  font-size: 12px;
  font-weight: 700;
}

.module-meter {
  margin-bottom: 16px;

  span {
    background: linear-gradient(90deg, #1a5fc5, #67c23a);
  }
}

.action-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  margin-bottom: 16px;
  border-radius: 12px;
  border: 1px solid #d8e8ff;
  background: #eef6ff;

  &.has-error {
    border-color: #f56c6c;
    background: #fffafa;
  }
}

.location-error {
  margin-top: -10px;
  margin-bottom: 14px;
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

.location-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 8px;
  margin-top: 8px;

  div {
    min-width: 0;
    padding: 9px 10px;
    border-radius: 10px;
    background: #fff;
  }

  span {
    display: block;
    margin-bottom: 4px;
    color: #6b7280;
    font-size: 11px;
  }

  strong {
    display: block;
    color: #1f2937;
    font-size: 13px;
    line-height: 1.35;
    word-break: break-word;
  }
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
  gap: 10px;
}

.choice-line {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  background: #fff;
  color: #303133;
  font-size: 15px;
  touch-action: manipulation;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.15s ease;

  input {
    width: 20px;
    height: 20px;
    accent-color: #1a5fc5;
    flex: 0 0 auto;
  }

  &:active {
    transform: scale(0.99);
    background: #f8fbff;
    border-color: #d8e8ff;
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
  height: 50px;
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  font-size: 15px;
  touch-action: manipulation;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.15s ease;

  &.primary {
    color: #fff;
    background: #1a5fc5;
    border-color: #1a5fc5;
  }

  &.error {
    border-color: #f56c6c;
  }

  &.disabled {
    opacity: 0.55;
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-within {
    outline: 3px solid rgba(26, 95, 197, 0.22);
    outline-offset: 2px;
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
  min-height: 44px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 10px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.15s ease;

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
  touch-action: manipulation;

  &:active {
    transform: scale(0.99);
    background: #eef6ff;
    border-color: #d8e8ff;
  }

  &:focus-within {
    outline: 3px solid rgba(26, 95, 197, 0.22);
    outline-offset: 2px;
  }
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

.drawer-search {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 0 4px 12px;
  background: #fff;
}

.empty-unit {
  padding: 12px 4px 20px;
  text-align: center;
}

:deep(.division-picker) {
  .division-actions {
    display: block;
    margin-bottom: 10px;

    button {
      width: 100%;
      min-height: 44px;
      border: 1px solid #d8e8ff;
      border-radius: 12px;
      color: #1a5fc5;
      background: #eef6ff;
      font-size: 14px;
      font-weight: 700;
      touch-action: manipulation;
      transition: background-color 0.2s ease, transform 0.15s ease;

      &:disabled {
        opacity: 0.45;
      }

      &:active:not(:disabled) {
        transform: scale(0.99);
      }
    }
  }

  .division-select-card {
    width: 100%;
    min-height: 52px;
    padding: 12px 12px 12px 14px;
    border: 1px solid #dce8f7;
    border-radius: 14px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #111827;
    text-align: left;
    touch-action: manipulation;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;

    &.has-error {
      border-color: #f56c6c;
      background: #fffafa;
    }

    &:disabled {
      opacity: 0.65;
    }

    &:active:not(:disabled) {
      transform: scale(0.99);
      border-color: #1a5fc5;
      box-shadow: 0 8px 18px rgba(26, 95, 197, 0.08);
    }
  }

  .division-select-text {
    min-width: 0;
    flex: 1;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.45;
    word-break: break-word;

    &.placeholder {
      color: #8b95a5;
      font-weight: 600;
    }
  }

  .division-select-arrow {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    color: #9aa4b2;
    background: #f3f6fb;
    font-size: 24px;
    line-height: 1;
  }

  .division-code-row {
    display: grid;
    grid-template-columns: 1fr;
    margin-top: 10px;

    button {
      min-height: 48px;
      border: 0;
      border-radius: 12px;
      color: #fff;
      background: #1a5fc5;
      font-size: 15px;
      font-weight: 700;

      &:disabled {
        opacity: 0.45;
      }
    }
  }

  .division-sheet-mask {
    position: fixed;
    inset: 0;
    z-index: 2200;
    display: flex;
    align-items: flex-end;
    background: rgba(15, 23, 42, 0.46);
  }

  .division-sheet {
    width: 100%;
    max-height: min(76vh, 720px);
    padding: 18px 0 calc(14px + env(safe-area-inset-bottom));
    border-radius: 22px 22px 0 0;
    background: #fff;
    box-shadow: 0 -16px 42px rgba(15, 23, 42, 0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: divisionSheetIn 0.22s ease-out;
  }

  .division-sheet-header {
    min-height: 48px;
    padding: 0 18px 8px;
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
  }

  .division-sheet-title {
    grid-column: 2;
    color: #101828;
    font-size: 22px;
    font-weight: 800;
    text-align: center;
    letter-spacing: 0;
  }

  .division-sheet-close {
    grid-column: 3;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 999px;
    color: #111827;
    background: #fff;
    font-size: 34px;
    line-height: 1;
    touch-action: manipulation;

    &:active {
      background: #f3f4f6;
    }
  }

  .division-path {
    position: relative;
    padding: 14px 28px 18px 42px;
    display: flex;
    flex-direction: column;
    gap: 0;
    border-bottom: 1px solid #eef0f4;

    &::before {
      content: '';
      position: absolute;
      left: 42px;
      top: 28px;
      bottom: 34px;
      width: 3px;
      border-radius: 999px;
      background: #ff6b00;
    }
  }

  .division-path-item {
    position: relative;
    min-height: 46px;
    padding: 0 28px 0 30px;
    border: 0;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #1f2937;
    font-size: 18px;
    font-weight: 650;
    text-align: left;
    touch-action: manipulation;

    &.active,
    &:active:not(:disabled) {
      color: #ff6b00;
    }

    &.disabled {
      color: #9aa4b2;
    }
  }

  .division-path-dot {
    position: absolute;
    left: -6px;
    width: 13px;
    height: 13px;
    border-radius: 999px;
    background: #ff6b00;
    box-shadow: 0 0 0 4px #fff;
  }

  .division-path-label {
    min-width: 0;
    flex: 1;
    line-height: 1.35;
    word-break: break-word;
  }

  .division-path-chevron {
    flex: 0 0 auto;
    color: #c4cad4;
    font-size: 28px;
    line-height: 1;
  }

  .division-option-header {
    padding: 14px 32px 8px;
    color: #7b8494;
    font-size: 13px;
    font-weight: 700;
  }

  .division-option-list {
    min-height: 180px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .division-option {
    width: 100%;
    min-height: 56px;
    padding: 0 32px;
    border: 0;
    background: #fff;
    display: grid;
    grid-template-columns: 36px 1fr 32px;
    align-items: center;
    gap: 12px;
    color: #1f2937;
    text-align: left;
    touch-action: manipulation;

    &:active {
      background: #fff7ed;
    }

    &.selected {
      color: #ff6b00;
      font-weight: 800;
    }
  }

  .division-option-index {
    color: #8490a3;
    font-size: 15px;
    font-weight: 500;
  }

  .division-option-name {
    min-width: 0;
    font-size: 18px;
    line-height: 1.35;
    word-break: break-word;
  }

  .division-option-check {
    color: #ff6b00;
    font-size: 26px;
    font-weight: 800;
    text-align: right;
  }
}

@keyframes divisionSheetIn {
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.unit-item {
  padding: 14px 4px;
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
  background: #fffafa;
}

.m-error {
  margin-top: 6px;
  font-size: 12px;
  color: #f56c6c;
  font-weight: 600;
}

.status-banner {
  margin: 8px 12px 0;
  padding: 10px 12px;
  border-radius: 10px;
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

  &.readonly {
    background: #ecf5ff;
    color: #1a5fc5;
  }

  &.rejected {
    align-items: flex-start;
    background: #fef0f0;
    color: #b42318;
    line-height: 1.45;
    font-weight: 600;
  }
}

:deep(.m-form-group) {
  margin-bottom: 18px;
}

:deep(.m-form-label) {
  display: flex;
  align-items: center;
  min-height: 22px;
  margin-bottom: 9px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

:deep(.m-input),
:deep(.m-select) {
  height: 48px;
  border-radius: 12px;
  background-color: #fff;
  font-size: 16px;
}

:deep(.m-textarea) {
  min-height: 96px;
  border-radius: 12px;
  background-color: #fff;
  font-size: 16px;
  line-height: 1.5;
}

:deep(.m-input.has-error),
:deep(.m-select.has-error),
:deep(.m-textarea.has-error) {
  border-color: #f56c6c;
  background: #fffafa;
}

:deep(.m-error) {
  margin-top: 6px;
  font-size: 12px;
  color: #f56c6c;
  font-weight: 600;
}

:deep(.radio-list),
:deep(.checkbox-list) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:deep(.choice-line) {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  background: #fff;
  color: #303133;
  font-size: 15px;
  touch-action: manipulation;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.15s ease;
}

:deep(.choice-line input) {
  width: 20px;
  height: 20px;
  accent-color: #1a5fc5;
  flex: 0 0 auto;
}

:deep(.choice-line:active) {
  transform: scale(0.99);
  background: #f8fbff;
  border-color: #d8e8ff;
}

:deep(.upload-actions),
:deep(.camera-actions) {
  display: flex;
  gap: 10px;
}

:deep(.camera-actions.single) {
  display: block;
}

:deep(.camera-button) {
  height: 50px;
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  font-size: 15px;
  touch-action: manipulation;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.15s ease;
}

:deep(.camera-button.primary) {
  color: #fff;
  background: #1a5fc5;
  border-color: #1a5fc5;
}

:deep(.camera-button.error) {
  border-color: #f56c6c;
}

:deep(.camera-button.disabled) {
  opacity: 0.55;
}

:deep(.camera-button:active) {
  transform: scale(0.98);
}

:deep(.camera-button:focus-within) {
  outline: 3px solid rgba(26, 95, 197, 0.22);
  outline-offset: 2px;
}

:deep(.camera-button input) {
  display: none;
}

:deep(.file-list) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

:deep(.file-row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 10px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.15s ease;
}

:deep(.file-row button) {
  border: 0;
  background: transparent;
  color: #f56c6c;
  font-size: 12px;
  flex: 0 0 auto;
}

:deep(.file-row input) {
  display: none;
}

:deep(.file-row.clickable) {
  cursor: pointer;
  touch-action: manipulation;
}

:deep(.file-row.clickable:active) {
  transform: scale(0.99);
  background: #eef6ff;
  border-color: #d8e8ff;
}

:deep(.file-row.clickable:focus-within) {
  outline: 3px solid rgba(26, 95, 197, 0.22);
  outline-offset: 2px;
}

:deep(.file-name) {
  min-width: 0;
  flex: 1;
  color: #1f2937;
  font-size: 13px;
  word-break: break-all;
}

:deep(.clickable-name) {
  cursor: pointer;
}

:deep(.file-action) {
  flex: 0 0 auto;
  color: #1a5fc5;
  font-size: 12px;
}

:deep(.el-button) {
  min-height: 44px;
}

:deep(.m-bottom-bar) {
  padding: 12px 14px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  gap: 12px;
  border-top: 1px solid #eef0f4;
  box-shadow: 0 -8px 22px rgba(31, 41, 55, 0.1);
}

:deep(.m-bottom-bar .el-button) {
  height: 48px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  touch-action: manipulation;
}

:deep(.m-bottom-bar .el-button:active) {
  transform: scale(0.98);
}

:deep(.m-input:focus),
:deep(.m-select:focus),
:deep(.m-textarea:focus) {
  outline: 3px solid rgba(26, 95, 197, 0.16);
  outline-offset: 1px;
}

.draft-action {
  color: #1a5fc5;
  border-color: #bfdbff;
  background: #eef6ff;
}

.submit-action {
  box-shadow: 0 8px 18px rgba(26, 95, 197, 0.22);
}

@media (max-width: 380px) {
  .two-cols {
    grid-template-columns: 1fr;
  }

  .hero-main {
    padding-right: 0;
  }

  .hero-progress {
    position: static;
    margin-top: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .module-anchor,
  .choice-line,
  .camera-button,
  .file-row,
  .hero-meter span,
  .module-meter span,
  :deep(.m-bottom-bar .el-button) {
    transition: none;
  }
}
</style>
