<template>
  <div class="page-container">
    <el-card shadow="never" style="margin-bottom: 16px;">
      <el-form :inline="true" :model="userStore.filters">
        <el-form-item label="关键词">
          <el-input v-model="userStore.filters.keyword" placeholder="姓名/用户名/手机号" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userStore.filters.role" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="opt in roleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="userStore.filters.status" placeholder="全部" clearable style="width: 100px">
            <el-option v-for="opt in USER_STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch" :icon="Search">查询</el-button>
          <el-button @click="handleReset" :icon="RefreshLeft">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <div class="page-header">
        <span class="page-title">用户列表</span>
        <el-button type="primary" @click="router.push('/system/users/create')" v-if="authStore.hasPermission('system:user:create')">
          <el-icon><Plus /></el-icon>新增用户
        </el-button>
      </div>

      <el-table :data="userStore.users" v-loading="userStore.loading" stripe border>
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="role" label="角色" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ getRoleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="areaName" label="管辖区域" min-width="120" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <StatusTag :value="row.status" :options="USER_STATUS_OPTIONS" />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="router.push(`/system/users/${row.id}/edit`)" v-if="authStore.hasPermission('system:user:update')">编辑</el-button>
            <el-button link :type="row.status === 'active' ? 'danger' : 'success'" size="small" @click="handleToggleStatus(row)" v-if="authStore.hasPermission('system:user:status')">
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="warning" size="small" @click="handleResetPassword(row)" v-if="authStore.hasPermission('system:user:reset_password')">重置密码</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination
          v-model:current-page="userStore.pagination.page"
          v-model:page-size="userStore.pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="userStore.total"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="userStore.fetchUsers()"
          @current-change="userStore.fetchUsers()"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRoleLabel, loadRoleOptions, USER_STATUS_OPTIONS } from '@/utils/constants'
import { formatDateTime } from '@/utils/formatters'
import StatusTag from '@/components/common/StatusTag.vue'

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const roleOptions = computed(() => loadRoleOptions())

onMounted(() => {
  userStore.fetchUsers()
})

function handleSearch() {
  userStore.pagination.page = 1
  userStore.fetchUsers()
}

function handleReset() {
  userStore.filters = { keyword: '', role: '', areaCode: '', status: '' }
  userStore.pagination.page = 1
  userStore.fetchUsers()
}

async function handleToggleStatus(user) {
  const action = user.status === 'active' ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定${action}用户「${user.realName}」吗？`, '确认', { type: 'warning' })
    await userStore.toggleUserStatus(user.id)
    ElMessage.success(`${action}成功`)
    userStore.fetchUsers()
  } catch { /* 取消 */ }
}

async function handleResetPassword(user) {
  try {
    await ElMessageBox.prompt('请输入新密码', '重置密码', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^.{6,}$/,
      inputErrorMessage: '密码长度不少于6位',
    }).then(async ({ value }) => {
      await userStore.resetPassword(user.id, value)
      ElMessage.success('密码重置成功')
    })
  } catch { /* 取消 */ }
}
</script>
