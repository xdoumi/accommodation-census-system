<template>
  <div class="mobile-login">
    <div class="login-header">
      <el-icon :size="48" color="#1a5fc5"><OfficeBuilding /></el-icon>
      <h1>住宿业普查</h1>
      <p>贵州省文化和旅游厅</p>
    </div>

    <div class="login-form">
      <div class="m-form-group">
        <div class="m-form-label">用户名</div>
        <input v-model="form.username" class="m-input" placeholder="请输入用户名" />
      </div>
      <div class="m-form-group">
        <div class="m-form-label">密码</div>
        <input v-model="form.password" class="m-input" type="password" placeholder="请输入密码" />
      </div>
      <el-button type="primary" class="m-btn" style="width: 100%; margin-top: 8px;" :loading="loading" @click="handleLogin">
        登 录
      </el-button>
    </div>

    <div class="login-tips">
      <p>演示账号：<code>enum01</code> / <code>admin123</code></p>
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
const loading = ref(false)

const form = reactive({ username: '', password: '' })

async function handleLogin() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const result = await authStore.login(form.username, form.password)
    if (result.success) {
      ElMessage.success('登录成功')
      const redirect = route.query.redirect || '/m/home'
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
.mobile-login {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 24px;
  background: linear-gradient(180deg, #1a5fc5 0%, #4a80d4 40%, #f5f6fa 40%);
}

.login-header {
  text-align: center;
  color: #fff;
  margin-bottom: 40px;
  padding-top: 20px;

  h1 {
    font-size: 24px;
    margin: 12px 0 4px;
    font-weight: 700;
  }

  p {
    font-size: 14px;
    opacity: 0.8;
  }
}

.login-form {
  background: #fff;
  border-radius: 16px;
  padding: 28px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.login-tips {
  text-align: center;
  margin-top: 24px;

  p {
    font-size: 13px;
    color: #909399;
  }

  code {
    background: #f0f2f5;
    padding: 1px 6px;
    border-radius: 3px;
    color: #1a5fc5;
    font-family: Consolas, monospace;
  }
}
</style>
