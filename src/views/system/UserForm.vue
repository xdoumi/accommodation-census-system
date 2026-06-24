<template>
  <div class="page-container">
    <el-page-header @back="router.push('/system/users')" :title="'返回列表'">
      <template #content>
        <span class="page-title">{{ isEdit ? '编辑用户' : '新增用户' }}</span>
      </template>
    </el-page-header>

    <el-card shadow="never" style="margin-top: 20px; max-width: 600px;">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="3-20位字母数字下划线" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="form.password" type="password" placeholder="默认: admin123" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%">
            <el-option v-for="opt in availableRoles" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="管辖区域" prop="areaCode">
          <AreaCascader v-model="form.areaCode" :level="areaLevel" />
        </el-form-item>
        <el-form-item>
          <el-button @click="router.push('/system/users')">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '创建用户' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useAreaStore } from '@/stores/area'
import { ElMessage } from 'element-plus'
import { loadRoleOptions } from '@/utils/constants'
import { validateUsername, validatePhone, validatePassword } from '@/utils/validators'
import AreaCascader from '@/components/common/AreaCascader.vue'
import db from '@/db'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const areaStore = useAreaStore()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const submitting = ref(false)

// 可创建的角色（根据当前用户角色限制）
const availableRoles = computed(() => {
  const role = authStore.userRole
  const roleOptions = loadRoleOptions()
  if (role === 'super_admin') return roleOptions
  if (role === 'provincial_admin') return roleOptions.filter(r => !['super_admin'].includes(r.value))
  if (role === 'city_admin') return roleOptions.filter(r => ['county_admin', 'enumerator'].includes(r.value))
  return []
})

// 区域级联级别
const areaLevel = computed(() => {
  if (['super_admin', 'provincial_admin'].includes(form.role)) return 1
  if (form.role === 'city_admin') return 2
  return 3
})

const form = reactive({
  username: '',
  realName: '',
  phone: '',
  password: '',
  role: '',
  areaCode: '',
  areaName: '',
})

const rules = {
  username: [{ required: true, validator: validateUsername, trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ validator: validatePhone, trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  areaCode: [{ required: true, message: '请选择管辖区域', trigger: 'change' }],
}

onMounted(async () => {
  await areaStore.fetchAreas()
  if (isEdit.value) {
    const user = await db.users.get(Number(route.params.id))
    if (user) {
      form.username = user.username
      form.realName = user.realName
      form.phone = user.phone || ''
      form.role = user.role
      form.areaCode = user.areaCode
      form.areaName = user.areaName
    }
  }
})

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    form.areaName = areaStore.getAreaName(form.areaCode)

    if (isEdit.value) {
      await userStore.updateUser(route.params.id, { ...form })
      ElMessage.success('修改成功')
    } else {
      await userStore.createUser({ ...form })
      ElMessage.success('创建成功')
    }
    router.push('/system/users')
  } finally {
    submitting.value = false
  }
}
</script>
