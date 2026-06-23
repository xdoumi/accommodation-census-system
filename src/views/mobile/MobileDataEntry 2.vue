<template>
  <div ref="rootRef"
    style="padding-bottom: 70px; touch-action: pan-y;"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <!-- 步骤条 -->
    <MobileFormStep :steps="stepLabels" :current="currentStep" />

    <!-- 离线/草稿状态条 -->
    <div v-if="statusBanner" class="status-banner" :class="statusBanner.type">
      <el-icon><component :is="statusBanner.icon" /></el-icon>
      <span>{{ statusBanner.text }}</span>
    </div>

    <!-- AI 语音输入（浮动按钮） -->
    <div style="position: fixed; bottom: 76px; right: 16px; z-index: 100; display: flex; align-items: center; gap: 6px; background: #fff; padding: 8px 12px; border-radius: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.12);">
      <AiVoiceInput @fields-extracted="handleAiFields" />
      <span style="font-size: 12px; color: #909399;">语音填报</span>
    </div>

    <!-- 当前住宿单位信息 -->
    <div class="m-card" style="padding: 10px 16px; margin-bottom: 0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; font-weight: 500;">{{ currentUnit?.name || '选择填报单位' }}</span>
        <el-button link type="primary" size="small" @click="currentStep = 0">
          {{ currentUnit ? '切换' : '选择' }}
        </el-button>
      </div>
    </div>

    <!-- Step 0: 选择单位 -->
    <div v-if="currentStep === 0" class="m-card">
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">选择填报单位</div>
      <div style="margin-bottom: 12px;">
        <input v-model="unitSearch" class="m-input" placeholder="搜索单位名称..." />
      </div>
      <div v-for="unit in filteredUnits" :key="unit.id" class="unit-item"
        :class="{ selected: currentUnitId === unit.id }" @click="selectUnit(unit)">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 14px; font-weight: 500;">{{ unit.name }}</div>
            <div style="font-size: 12px; color: #909399; margin-top: 2px;">{{ CATEGORY_MAP[unit.category] }} · {{ unit.detailAddress }}</div>
          </div>
          <el-icon v-if="currentUnitId === unit.id" color="#1a5fc5"><Check /></el-icon>
        </div>
      </div>
      <div v-if="filteredUnits.length === 0" style="text-align: center; color: #909399; padding: 20px;">
        未找到住宿单位
      </div>
    </div>

    <!-- Step 1: 基础信息 -->
    <div v-if="currentStep === 1" class="m-card">
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 16px;">基础信息</div>

      <div class="m-form-group">
        <div class="m-form-label"><span class="required">*</span>单位名称</div>
        <input v-model="form.name" class="m-input" :class="{ 'has-error': errors.name }" placeholder="请输入单位名称" />
        <div v-if="errors.name" class="m-error">{{ errors.name }}</div>
      </div>

      <div class="m-form-group">
        <div class="m-form-label">{{ isRequired('category') ? '* ' : '' }}类别</div>
        <el-select v-model="form.category" placeholder="请选择" style="width: 100%;" size="large">
          <el-option v-for="opt in CATEGORY_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <div v-if="errors.category" class="m-error">{{ errors.category }}</div>
      </div>

      <div class="m-form-group">
        <div class="m-form-label">详细地址</div>
        <input v-model="form.detailAddress" class="m-input" placeholder="请输入详细地址" />
      </div>

      <div class="m-form-group">
        <div class="m-form-label"><span class="required">*</span>经营状态</div>
        <el-select v-model="form.operatingStatus" placeholder="请选择" style="width: 100%;" size="large">
          <el-option v-for="opt in OPERATING_STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>

      <div class="m-form-group">
        <div class="m-form-label">{{ isRequired('licenseStatus') ? '* ' : '' }}证照状态</div>
        <el-select v-model="form.licenseStatus" placeholder="请选择" style="width: 100%;" size="large">
          <el-option v-for="opt in LICENSE_STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <div v-if="errors.licenseStatus" class="m-error">{{ errors.licenseStatus }}</div>
      </div>
    </div>

    <!-- Step 2: 规模设施 -->
    <div v-if="currentStep === 2" class="m-card">
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 16px;">规模与设施</div>

      <el-row :gutter="12">
        <el-col :span="12">
          <div class="m-form-group">
            <div class="m-form-label">{{ isRequired('rooms') ? '* ' : '' }}客房数</div>
            <input v-model.number="form.rooms" class="m-input" :class="{ 'has-error': errors.rooms }" type="number" placeholder="间" />
            <div v-if="errors.rooms" class="m-error">{{ errors.rooms }}</div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="m-form-group">
            <div class="m-form-label">{{ isRequired('beds') ? '* ' : '' }}床位数</div>
            <input v-model.number="form.beds" class="m-input" :class="{ 'has-error': errors.beds }" type="number" placeholder="张" />
            <div v-if="errors.beds" class="m-error">{{ errors.beds }}</div>
          </div>
        </el-col>
      </el-row>

      <div class="m-form-group">
        <div class="m-form-label">建筑面积(㎡)</div>
        <input v-model.number="form.floorArea" class="m-input" type="number" placeholder="平方米" />
      </div>

      <!-- 配套设施开关 -->
      <div style="margin-top: 8px;">
        <div class="m-switch-row">
          <span class="m-switch-label">餐饮服务</span>
          <el-switch v-model="form.hasDining" />
        </div>
        <div class="m-switch-row">
          <span class="m-switch-label">会议室</span>
          <el-switch v-model="form.hasConference" />
        </div>
        <div class="m-switch-row">
          <span class="m-switch-label">停车场</span>
          <el-switch v-model="form.hasParking" />
        </div>
        <div class="m-switch-row">
          <span class="m-switch-label">游泳池</span>
          <el-switch v-model="form.hasPool" />
        </div>
        <div class="m-switch-row">
          <span class="m-switch-label">健身房</span>
          <el-switch v-model="form.hasGym" />
        </div>
        <div class="m-switch-row">
          <span class="m-switch-label">无障碍设施</span>
          <el-switch v-model="form.hasAccessibility" />
        </div>
      </div>
    </div>

    <!-- Step 3: 经营数据 -->
    <div v-if="currentStep === 3" class="m-card">
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 16px;">经营数据</div>

      <el-row :gutter="12">
        <el-col :span="12">
          <div class="m-form-group">
            <div class="m-form-label">{{ isRequired('occupancyRate') ? '* ' : '' }}入住率(%)</div>
            <input v-model.number="form.occupancyRate" class="m-input" :class="{ 'has-error': errors.occupancyRate }" type="number" placeholder="如 65.5" />
            <div v-if="errors.occupancyRate" class="m-error">{{ errors.occupancyRate }}</div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="m-form-group">
            <div class="m-form-label">{{ isRequired('adr') ? '* ' : '' }}平均房价(元)</div>
            <input v-model.number="form.adr" class="m-input" :class="{ 'has-error': errors.adr }" type="number" placeholder="如 280" />
            <div v-if="errors.adr" class="m-error">{{ errors.adr }}</div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="12">
        <el-col :span="12">
          <div class="m-form-group">
            <div class="m-form-label">RevPAR(元)</div>
            <input v-model.number="form.revpar" class="m-input" type="number" placeholder="如 182" />
          </div>
        </el-col>
        <el-col :span="12">
          <div class="m-form-group">
            <div class="m-form-label">{{ isRequired('staffCount') ? '* ' : '' }}从业人数</div>
            <input v-model.number="form.staffCount" class="m-input" :class="{ 'has-error': errors.staffCount }" type="number" placeholder="如 32" />
            <div v-if="errors.staffCount" class="m-error">{{ errors.staffCount }}</div>
          </div>
        </el-col>
      </el-row>

      <div class="m-form-group">
        <div class="m-form-label">年营业收入(元)</div>
        <input v-model.number="form.annualRevenue" class="m-input" type="number" placeholder="如 5200000" />
      </div>
    </div>

    <!-- Step 4: 合规安全 -->
    <div v-if="currentStep === 4" class="m-card">
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 16px;">合规与安全</div>

      <div class="m-form-group">
        <div class="m-form-label">{{ isRequired('fireInspection') ? '* ' : '' }}消防验收</div>
        <el-select v-model="form.fireInspection" placeholder="请选择" style="width: 100%;" size="large">
          <el-option v-for="opt in FIRE_INSPECTION_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <div v-if="errors.fireInspection" class="m-error">{{ errors.fireInspection }}</div>
      </div>

      <div class="m-form-group">
        <div class="m-form-label">{{ isRequired('healthPermit') ? '* ' : '' }}卫生许可</div>
        <el-select v-model="form.healthPermit" placeholder="请选择" style="width: 100%;" size="large">
          <el-option v-for="opt in HEALTH_PERMIT_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <div v-if="errors.healthPermit" class="m-error">{{ errors.healthPermit }}</div>
      </div>

      <div class="m-form-group">
        <div class="m-form-label">近一年安全事故</div>
        <input v-model.number="form.safetyIncidents" class="m-input" type="number" placeholder="次" />
      </div>

      <div class="m-switch-row">
        <span class="m-switch-label">消防安全合格</span>
        <el-switch v-model="form.fireSafetyCertified" />
      </div>
      <div class="m-switch-row">
        <span class="m-switch-label">已制定应急预案</span>
        <el-switch v-model="form.hasEmergencyPlan" />
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="m-bottom-bar">
      <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
      <el-button v-if="currentStep > 0 && currentStep < 4" type="info" @click="saveDraft">保存草稿</el-button>
      <el-button v-if="currentStep < 4" type="primary" @click="nextStep">下一步</el-button>
      <el-button v-if="currentStep === 4" type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCensusStore } from '@/stores/census'
import { useOfflineQueue } from '@/composables/useOfflineQueue'
import db from '@/db'
import { ElMessage } from 'element-plus'
import {
  CATEGORY_OPTIONS, CATEGORY_MAP, OPERATING_STATUS_OPTIONS, LICENSE_STATUS_OPTIONS,
  FIRE_INSPECTION_OPTIONS, HEALTH_PERMIT_OPTIONS,
} from '@/utils/constants'
import MobileFormStep from '@/components/mobile/MobileFormStep.vue'
import AiVoiceInput from '@/components/ai/AiVoiceInput.vue'

const route = useRoute()
const router = useRouter()
const censusStore = useCensusStore()
const offlineQueue = useOfflineQueue()
const rootRef = ref(null)

const currentStep = ref(0)
const stepLabels = ['选择单位', '基础信息', '规模设施', '经营数据', '合规安全']

const currentUnitId = ref(null)
const currentUnit = ref(null)
const unitSearch = ref('')
const units = ref([])
const submitting = ref(false)
const errors = ref({})

// 字段所属步骤 —— 校验失败时定位
const fieldToStep = {
  name: 1, category: 1, licenseStatus: 1,
  rooms: 2, beds: 2,
  occupancyRate: 3, adr: 3, staffCount: 3,
  fireInspection: 4, healthPermit: 4,
}

const form = reactive({
  name: '', category: '', detailAddress: '', operatingStatus: 'operating', licenseStatus: '',
  rooms: 0, beds: 0, floorArea: 0,
  hasDining: false, hasConference: false, hasParking: false, hasPool: false, hasGym: false, hasAccessibility: false,
  fireSafetyCertified: false,
  occupancyRate: 0, adr: 0, revpar: 0, annualRevenue: 0, staffCount: 0,
  fireInspection: '', healthPermit: '', safetyIncidents: 0, hasEmergencyPlan: false,
})

// ============ 草稿持久化 ============
const draftKey = computed(() => `census_draft_${route.params.taskId}_${route.params.assignmentId || 'global'}_${currentUnitId.value || 'none'}`)

function saveLocalDraft() {
  if (!currentUnitId.value) return
  try {
    localStorage.setItem(draftKey.value, JSON.stringify({
      form: { ...form },
      currentStep: currentStep.value,
      currentUnitId: currentUnitId.value,
      ts: Date.now(),
    }))
  } catch { /* localStorage 满了等情况静默忽略 */ }
}

function restoreLocalDraft(unitId) {
  const key = `census_draft_${route.params.taskId}_${route.params.assignmentId || 'global'}_${unitId}`
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const data = JSON.parse(raw)
    Object.assign(form, data.form)
    if (typeof data.currentStep === 'number') currentStep.value = data.currentStep
    return true
  } catch { return false }
}

function clearLocalDraft() {
  if (!currentUnitId.value) return
  localStorage.removeItem(draftKey.value)
}

// 自动保存：表单变化时节流写入
let saveTimer = null
watch(() => ({ ...form }), () => {
  if (!currentUnitId.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveLocalDraft, 500)
}, { deep: true })

// ============ 必填校验 ============
const requiredFields = computed(() => {
  const task = censusStore.currentTask
  if (!task?.requiredFields) return ['name', 'operatingStatus']
  try {
    const list = JSON.parse(task.requiredFields)
    // 始终把 name / operatingStatus 视为必填
    return Array.from(new Set(['name', 'operatingStatus', ...list]))
  } catch { return ['name', 'operatingStatus'] }
})

function isRequired(field) {
  return requiredFields.value.includes(field)
}

function validate() {
  const e = {}
  for (const field of requiredFields.value) {
    const v = form[field]
    if (v === '' || v === null || v === undefined) {
      e[field] = '必填项'
      continue
    }
    // 数值型必填字段：≤ 0 视为未填
    if (['rooms', 'beds', 'occupancyRate', 'adr', 'staffCount'].includes(field)) {
      if (Number(v) <= 0) e[field] = '请填写大于 0 的数值'
    }
  }
  errors.value = e
  return Object.keys(e).length === 0
}

// ============ 单位与数据加载 ============
const filteredUnits = computed(() => {
  if (!unitSearch.value) return units.value
  const kw = unitSearch.value.toLowerCase()
  return units.value.filter(u => u.name.toLowerCase().includes(kw))
})

onMounted(async () => {
  const taskId = route.params.taskId
  const assignmentId = route.params.assignmentId

  await censusStore.fetchTaskDetail(taskId)

  if (assignmentId) {
    const assignment = censusStore.assignments.find(a => a.id === Number(assignmentId))
    if (assignment) {
      units.value = await db.accommodations.where('countyCode').equals(assignment.areaCode).toArray()
      if (units.value.length === 0) {
        units.value = await db.accommodations.where('cityCode').equals(assignment.areaCode).toArray()
      }
    }
  } else {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    if (authStore.userRole === 'enumerator' || authStore.userRole === 'county_admin') {
      units.value = await db.accommodations.where('countyCode').equals(authStore.userAreaCode).toArray()
    } else {
      units.value = await db.accommodations.toArray()
    }
  }
})

function selectUnit(unit) {
  currentUnitId.value = unit.id
  currentUnit.value = unit
  // 先填充已有数据
  Object.keys(form).forEach(key => {
    if (unit[key] !== undefined) form[key] = unit[key]
  })
  // 再尝试恢复草稿（草稿优先）
  const restored = restoreLocalDraft(unit.id)
  if (restored) {
    ElMessage.success('已恢复上次未完成的草稿')
  } else {
    setTimeout(() => { currentStep.value = 1 }, 200)
  }
}

// ============ AI 填充 ============
function handleAiFields(fields) {
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      form[key] = value
    }
  })
  if (currentStep.value === 0 && !currentUnitId.value) {
    ElMessage.info('AI 已填充字段，请选择对应的单位继续填报')
  }
}

// ============ 步骤切换 + 滑动手势 ============
function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}

function nextStep() {
  if (currentStep.value === 0 && !currentUnitId.value) {
    ElMessage.warning('请先选择填报单位')
    return
  }
  if (currentStep.value < 4) currentStep.value++
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
  // 横向位移必须明显大于纵向（避免与垂直滚动冲突）
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return
  if (dx < 0) nextStep()
  else prevStep()
}

// ============ 草稿 / 提交 ============
async function saveDraft() {
  if (!currentUnitId.value) return
  saveLocalDraft()
  // 入队等待离线/在线提交
  offlineQueue.enqueue({
    type: 'updateAccommodation',
    payload: { id: currentUnitId.value, data: { ...form } },
  })
  ElMessage.success(offlineQueue.isOnline.value ? '草稿已保存' : '已加入离线队列，恢复网络后自动同步')
}

async function handleSubmit() {
  if (!currentUnitId.value) {
    ElMessage.warning('请先选择填报单位')
    currentStep.value = 0
    return
  }
  if (!validate()) {
    const firstErrField = Object.keys(errors.value)[0]
    const step = fieldToStep[firstErrField]
    if (step != null) currentStep.value = step
    ElMessage.error(`「${stepLabels[step] || ''}」存在未填写的必填项`)
    return
  }

  submitting.value = true
  try {
    const taskId = Number(route.params.taskId)
    const assignmentId = route.params.assignmentId ? Number(route.params.assignmentId) : null

    if (offlineQueue.isOnline.value) {
      // 在线：直接写库
      await db.accommodations.update(currentUnitId.value, { ...form, updatedAt: new Date().toISOString() })
      if (assignmentId) {
        await censusStore.saveRecord({
          taskId, assignmentId, accommodationId: currentUnitId.value, status: 'submitted',
        })
      }
      ElMessage.success('提交成功！')
    } else {
      // 离线：进队列
      offlineQueue.enqueue({
        type: 'updateAccommodation',
        payload: { id: currentUnitId.value, data: { ...form } },
      })
      if (assignmentId) {
        offlineQueue.enqueue({
          type: 'addCensusRecord',
          payload: { taskId, assignmentId, accommodationId: currentUnitId.value, status: 'submitted' },
        })
      }
      ElMessage.success('已加入离线队列，恢复网络后自动提交')
    }

    clearLocalDraft()
    router.back()
  } catch (err) {
    ElMessage.error('提交失败：' + err.message)
  } finally {
    submitting.value = false
  }
}

// ============ 状态横幅 ============
const statusBanner = computed(() => {
  if (!offlineQueue.isOnline.value) {
    return { type: 'offline', icon: 'WarningFilled', text: '当前离线 · 提交将进入队列，恢复网络后自动同步' }
  }
  if (offlineQueue.pendingCount.value > 0) {
    return { type: 'syncing', icon: 'Refresh', text: `正在后台同步 ${offlineQueue.pendingCount.value} 条草稿...` }
  }
  return null
})
</script>

<style lang="scss" scoped>
.unit-item {
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 8px;
  background: #f9fafc;
  border: 2px solid transparent;
  transition: all 0.2s;

  &.selected {
    border-color: #1a5fc5;
    background: #e8f0fa;
  }

  &:active {
    background: #f0f2f5;
  }
}

.m-input.has-error {
  border-color: #f56c6c;
}

.m-error {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
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
