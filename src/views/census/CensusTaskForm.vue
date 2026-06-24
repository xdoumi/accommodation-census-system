<template>
  <div class="page-container">
    <el-page-header @back="router.push('/census')" :title="'返回列表'">
      <template #content>
        <span class="page-title">{{ isEdit ? '编辑主任务' : '创建主任务' }}</span>
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
          <el-col :span="24">
            <el-form-item label="任务范围" prop="scopeAreaCodes">
              <el-radio-group v-model="form.scopeType" style="margin-bottom: 12px;">
                <el-radio label="province">全省</el-radio>
                <el-radio label="custom">勾选区域</el-radio>
              </el-radio-group>
              <AreaAssignTree v-if="form.scopeType === 'custom'" v-model="form.scopeAreaCodes" />
              <el-alert v-else type="info" :closable="false" title="任务范围：贵州省全省" />
            </el-form-item>
          </el-col>
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
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCensusStore } from '@/stores/census'
import AreaAssignTree from '@/components/census/AreaAssignTree.vue'

const route = useRoute()
const router = useRouter()
const store = useCensusStore()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const submitting = ref(false)

const form = reactive({
  title: '',
  description: '',
  startDate: '',
  deadline: '',
  scopeType: 'province',
  scopeAreaCodes: [],
})

const rules = {
  title: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择截止日期', trigger: 'change' }],
  scopeAreaCodes: [{
    validator: (_, value, callback) => {
      if (form.scopeType === 'custom' && (!value || value.length === 0)) callback(new Error('请至少选择一个任务范围区域'))
      else callback()
    },
    trigger: 'change',
  }],
}

onMounted(async () => {
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
    }
  }
})

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const scopeAreaCodes = form.scopeType === 'province' ? ['520000'] : form.scopeAreaCodes
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
</script>
