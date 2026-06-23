<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <el-icon :size="40" color="#1a5fc5"><OfficeBuilding /></el-icon>
        <h1>住宿业普查管理系统</h1>
        <p>文化和旅游厅</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" class="login-form" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" class="login-btn" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-tips">
        <el-divider>演示账号</el-divider>
        <p>超级管理员：<code>admin</code> / <code>admin123</code></p>
        <p>省级管理员：<code>prov_admin</code> / <code>admin123</code></p>
        <p>市级管理员：<code>gy_admin</code> / <code>admin123</code></p>
        <p>县级管理员：<code>nh_admin</code> / <code>admin123</code></p>
        <p>普查员：<code>enum01</code> / <code>admin123</code></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const result = await authStore.login(form.username, form.password)
    if (result.success) {
      ElMessage.success('登录成功')
      // PC 登录页不允许跳到 /m/ 移动端，移动端 redirect 视为非法兜底到 /
      const rawRedirect = route.query.redirect
      const redirect = (typeof rawRedirect === 'string' && !rawRedirect.startsWith('/m'))
        ? rawRedirect
        : '/'
      router.push(redirect)
    } else {
      ElMessage.error(result.message)
    }
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0e3f8f 0%, #1a5fc5 50%, #4a80d4 100%);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.03);
    top: -200px;
    right: -100px;
  }

  &::after {
    content: '';
    position: absolute;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    bottom: -100px;
    left: -50px;
  }
}

.login-card {
  width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 36px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;

  h1 {
    font-size: 22px;
    color: #1a1a1a;
    margin: 12px 0 4px;
    font-weight: 700;
  }

  p {
    color: #909399;
    font-size: 14px;
  }
}

.login-form {
  .login-btn {
    width: 100%;
  }
}

.login-tips {
  text-align: center;

  p {
    font-size: 12px;
    color: #909399;
    margin: 4px 0;

    code {
      background: #f5f7fa;
      padding: 1px 6px;
      border-radius: 3px;
      color: #1a5fc5;
      font-family: Consolas, monospace;
    }
  }
}
</style>
