<template>
  <div class="page-container">
    <el-page-header @back="router.push('/census')" :title="'返回列表'">
      <template #content>
        <span class="page-title">{{ pageTitle }}</span>
      </template>
    </el-page-header>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" style="margin-top: 20px;">
      <el-card shadow="never">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="任务名称" prop="title">
              <el-input v-model="form.title" placeholder="请输入主任务名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="开始日期" prop="startDate">
              <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" placeholder="选择开始日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期" prop="deadline">
              <el-date-picker v-model="form.deadline" type="date" value-format="YYYY-MM-DD" placeholder="选择截止日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="任务描述" prop="description">
              <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请描述普查任务的目标和要求" />
            </el-form-item>
          </el-col>
          <el-col v-if="!isSubTaskEdit" :span="24">
            <el-form-item label="任务范围" prop="scopeAreaCodes">
              <el-radio-group v-model="form.scopeType" style="margin-bottom: 12px;">
                <el-radio label="province">全省</el-radio>
                <el-radio label="custom">勾选区域</el-radio>
              </el-radio-group>
              <AreaAssignTree v-if="form.scopeType === 'custom'" v-model="form.scopeAreaCodes" />
              <el-alert v-else type="info" :closable="false" title="任务范围：贵州省全省" />
            </el-form-item>
          </el-col>
          <template v-else>
            <el-col :span="24">
              <el-form-item label="分配区域" prop="assignedAreaCodes">
                <AreaAssignTree v-model="form.assignedAreaCodes" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="区县抽查量">
                <el-table :data="quotaCountyRows" border size="small" empty-text="请先选择分配区域">
                  <el-table-column label="市州" width="140">
                    <template #default="{ row }">{{ areaStore.getAreaName(row.parentCode) || '-' }}</template>
                  </el-table-column>
                  <el-table-column prop="name" label="区县" min-width="160" />
                  <el-table-column label="抽查量" width="180" align="center">
                    <template #default="{ row }">
                      <el-input-number
                        v-model="form.spotCheckQuotaByCounty[row.code]"
                        :min="0"
                        :precision="0"
                        :step="1"
                        controls-position="right"
                        style="width: 130px"
                      />
                    </template>
                  </el-table-column>
                </el-table>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="普查人员" prop="responsibleUserIds">
                <el-select
                  v-model="form.responsibleUserIds"
                  multiple
                  filterable
                  clearable
                  placeholder="输入姓名、用户名或手机号搜索并选择普查人员"
                  style="width: 100%"
                >
                  <el-option
                    v-for="user in enumeratorUsers"
                    :key="user.id"
                    :label="`${user.realName}（${user.username} · ${user.areaName || '-' }）`"
                    :value="user.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </template>
        </el-row>
      </el-card>

      <div style="margin-top: 20px; text-align: center;">
        <el-button @click="router.push('/census')">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '创建主任务' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCensusStore } from '@/stores/census'
import { useAreaStore } from '@/stores/area'
import AreaAssignTree from '@/components/census/AreaAssignTree.vue'
import db from '@/db'
import { parseJsonObject } from '@/utils/taskMetrics'

const route = useRoute()
const router = useRouter()
const store = useCensusStore()
const areaStore = useAreaStore()

const isEdit = computed(() => !!route.params.id)
const isSubTaskEdit = computed(() => isEdit.value && (store.currentTask?.taskType || 'main') === 'sub')
const pageTitle = computed(() => {
  if (isSubTaskEdit.value) return '编辑子任务'
  return isEdit.value ? '编辑主任务' : '创建主任务'
})
const formRef = ref(null)
const submitting = ref(false)
const enumeratorUsers = ref([])
const spotDefaultByCounty = ref({})

const form = reactive({
  title: '',
  description: '',
  startDate: '',
  deadline: '',
  scopeType: 'province',
  scopeAreaCodes: [],
  assignedAreaCodes: [],
  responsibleUserIds: [],
  spotCheckQuotaByCounty: {},
})

const rules = {
  title: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择截止日期', trigger: 'change' }],
  scopeAreaCodes: [{
    validator: (_, value, callback) => {
      if (isSubTaskEdit.value) {
        callback()
        return
      }
      if (form.scopeType === 'custom' && (!value || value.length === 0)) callback(new Error('请至少选择一个任务范围区域'))
      else callback()
    },
    trigger: 'change',
  }],
  assignedAreaCodes: [{
    validator: (_, value, callback) => {
      if (!isSubTaskEdit.value) {
        callback()
        return
      }
      if (!value || value.length === 0) callback(new Error('请选择分配区域'))
      else callback()
    },
    trigger: 'change',
  }],
  responsibleUserIds: [{
    validator: (_, value, callback) => {
      if (!isSubTaskEdit.value) {
        callback()
        return
      }
      if (!value || value.length === 0) callback(new Error('请选择普查人员'))
      else callback()
    },
    trigger: 'change',
  }],
}

const quotaCountyRows = computed(() => expandAssignedCountyCodes(form.assignedAreaCodes)
  .map(code => areaStore.getAreaByCode(code))
  .filter(Boolean)
  .sort((a, b) => String(a.parentCode).localeCompare(String(b.parentCode)) || String(a.code).localeCompare(String(b.code))))

onMounted(async () => {
  await areaStore.fetchAreas()
  await loadSpotDefaults()
  enumeratorUsers.value = (await db.users.toArray()).filter(user => user.role === 'enumerator' && user.status === 'active')
  if (isEdit.value) {
    await store.fetchTaskDetail(route.params.id)
    const task = store.currentTask
    if (task) {
      form.title = task.title
      form.description = task.description
      form.startDate = task.startDate?.split('T')[0] || task.startDate || ''
      form.deadline = task.deadline?.split('T')[0] || task.deadline
      form.scopeType = task.scopeType || 'province'
      try { form.scopeAreaCodes = JSON.parse(task.scopeAreaCodes || task.assignedAreaCodes || '[]') } catch {}
      try { form.assignedAreaCodes = JSON.parse(task.assignedAreaCodes || '[]') } catch {}
      try { form.responsibleUserIds = JSON.parse(task.responsibleUserIds || '[]') } catch {}
      form.spotCheckQuotaByCounty = parseJsonObject(task.spotCheckQuotaByCounty)
      syncSpotQuotaDefaults()
    }
  }
})

watch(() => form.assignedAreaCodes.slice(), () => {
  if (isSubTaskEdit.value) syncSpotQuotaDefaults()
}, { deep: true })

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const scopeAreaCodes = form.scopeType === 'province' ? ['520000'] : form.scopeAreaCodes
    if (isSubTaskEdit.value) {
      const selectedUsers = enumeratorUsers.value.filter(user => form.responsibleUserIds.includes(user.id))
      await store.updateSubTask(route.params.id, {
        title: form.title,
        description: form.description,
        startDate: form.startDate,
        deadline: form.deadline,
        assignedAreaCodes: JSON.stringify(form.assignedAreaCodes),
        responsibleUserIds: JSON.stringify(form.responsibleUserIds),
        responsibleUserNames: selectedUsers.map(user => user.realName).join('、'),
        spotCheckQuotaByCounty: JSON.stringify(normalizedSpotQuota()),
      })
      ElMessage.success('子任务已保存')
      router.push(`/census/${store.currentTask?.parentTaskId || route.params.id}`)
      return
    }
    const data = {
      taskType: 'main',
      title: form.title,
      description: form.description,
      startDate: form.startDate,
      deadline: form.deadline,
      scopeType: form.scopeType,
      scopeAreaCodes: JSON.stringify(scopeAreaCodes),
      assignedAreaCodes: JSON.stringify(scopeAreaCodes),
    }
    if (isEdit.value) {
      await store.updateTask(route.params.id, data)
      ElMessage.success('主任务已保存')
    } else {
      await store.createTask(data)
      ElMessage.success('主任务已创建')
    }
    router.push('/census')
  } finally {
    submitting.value = false
  }
}

function syncSpotQuotaDefaults() {
  const current = { ...form.spotCheckQuotaByCounty }
  const selectedCodes = quotaCountyRows.value.map(item => item.code)
  const selectedSet = new Set(selectedCodes)
  Object.keys(current).forEach(code => {
    if (!selectedSet.has(code)) delete current[code]
  })
  selectedCodes.forEach(code => {
    const explicit = Number(current[code])
    if (Number.isInteger(explicit) && explicit >= 0) return
    current[code] = Number(spotDefaultByCounty.value[code] || 0)
  })
  form.spotCheckQuotaByCounty = current
}

async function loadSpotDefaults() {
  const units = await db.accommodations.filter(item => !item.deletedAt && item.checkType === 'catalog_spot_check').toArray()
  spotDefaultByCounty.value = units.reduce((acc, unit) => {
    const code = String(unit.countyCode || '')
    if (!code) return acc
    acc[code] = (acc[code] || 0) + 1
    return acc
  }, {})
}

function normalizedSpotQuota() {
  syncSpotQuotaDefaults()
  return Object.fromEntries(Object.entries(form.spotCheckQuotaByCounty).map(([code, value]) => {
    const next = Number(value)
    return [code, Number.isInteger(next) && next >= 0 ? next : 0]
  }))
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
</script>
