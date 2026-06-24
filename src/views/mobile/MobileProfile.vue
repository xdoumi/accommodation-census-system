<template>
  <div style="padding-bottom: 16px;">
    <!-- 用户信息卡 -->
    <div class="m-card" style="text-align: center; margin-top: 0; border-radius: 0 0 16px 16px; padding: 28px 16px;">
      <el-avatar :size="64" :icon="UserFilled" style="background: #1a5fc5; margin-bottom: 12px;" />
      <h3 style="margin: 0; font-size: 18px;">{{ authStore.currentUser?.realName }}</h3>
      <p style="color: #909399; margin-top: 4px; font-size: 14px;">
        {{ getRoleLabel(authStore.userRole) }} · {{ authStore.currentUser?.areaName }}
      </p>
      <p style="color: #c0c4cc; margin-top: 2px; font-size: 13px;">
        @{{ authStore.currentUser?.username }}
      </p>
    </div>

    <!-- 功能列表 -->
    <div class="m-card" style="padding: 0; overflow: hidden;">
      <div class="m-list-item" @click="handleChangePassword">
        <div class="m-list-icon" style="background: #fdf6ec; color: #e6a23c;"><el-icon><Lock /></el-icon></div>
        <div class="m-list-content"><div class="m-list-title">修改密码</div></div>
        <el-icon class="m-list-arrow"><ArrowRight /></el-icon>
      </div>
      <div class="m-list-item" @click="handleClearCache">
        <div class="m-list-icon" style="background: #e8f0fa; color: #1a5fc5;"><el-icon><Delete /></el-icon></div>
        <div class="m-list-content"><div class="m-list-title">清除缓存</div></div>
        <el-icon class="m-list-arrow"><ArrowRight /></el-icon>
      </div>
      <div class="m-list-item" @click="switchToDesktop">
        <div class="m-list-icon" style="background: #e8f8ef; color: #67c23a;"><el-icon><Monitor /></el-icon></div>
        <div class="m-list-content"><div class="m-list-title">切换桌面版</div></div>
        <el-icon class="m-list-arrow"><ArrowRight /></el-icon>
      </div>
    </div>

    <!-- 退出登录 -->
    <div class="m-card" style="padding: 0; overflow: hidden;">
      <div class="m-list-item" @click="handleLogout" style="justify-content: center;">
        <span style="color: #f56c6c; font-size: 16px; font-weight: 500;">退出登录</span>
      </div>
    </div>

    <!-- 版本信息 -->
    <div style="text-align: center; padding: 20px; color: #c0c4cc; font-size: 12px;">
      住宿业普查管理系统 v1.0.0
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getRoleLabel } from '@/utils/constants'
import { ElMessage, ElMessageBox } from 'element-plus'
import db from '@/db'

const router = useRouter()
const authStore = useAuthStore()

function switchToDesktop() {
  router.push('/')
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    authStore.logout()
    router.push('/m/login')
  } catch { /* 取消 */ }
}

async function handleChangePassword() {
  try {
    await ElMessageBox.prompt('请输入新密码（不少于6位）', '修改密码', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^.{6,}$/,
      inputErrorMessage: '密码长度不少于6位',
    }).then(async ({ value }) => {
      const { useUserStore } = await import('@/stores/user')
      const userStore = useUserStore()
      await userStore.resetPassword(authStore.currentUser.id, value)
      ElMessage.success('密码修改成功')
    })
  } catch { /* 取消 */ }
}

async function handleClearCache() {
  try {
    await ElMessageBox.confirm('确定要清除本地缓存数据吗？这将重置所有数据。', '警告', {
      confirmButtonText: '确定清除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await db.delete()
    window.location.reload()
  } catch { /* 取消 */ }
}
</script>
