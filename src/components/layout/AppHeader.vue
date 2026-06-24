<template>
  <el-header class="app-header" :height="'56px'">
    <div class="header-left">
      <el-icon class="collapse-btn" @click="$emit('toggle-sidebar')">
        <Fold v-if="!collapsed" />
        <Expand v-else />
      </el-icon>
    </div>
    <div class="header-right">
      <el-dropdown trigger="click" @command="handleCommand">
        <span class="user-info">
          <el-avatar :size="32" :icon="UserFilled" />
          <span class="user-name">{{ authStore.currentUser?.realName }}</span>
          <span class="user-role">{{ roleLabel }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>
              <el-icon><User /></el-icon>
              {{ authStore.currentUser?.username }}
            </el-dropdown-item>
            <el-dropdown-item disabled>
              <el-icon><Location /></el-icon>
              {{ authStore.currentUser?.areaName }}
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </el-header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getRoleLabel } from '@/utils/constants'
import { UserFilled } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

defineProps({ collapsed: Boolean })
defineEmits(['toggle-sidebar'])

const router = useRouter()
const authStore = useAuthStore()

const roleLabel = computed(() => getRoleLabel(authStore.userRole))

async function handleCommand(command) {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
      authStore.logout()
      router.push('/login')
    } catch {
      // 取消
    }
  }
}
</script>

<style lang="scss" scoped>
.app-header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;

  .collapse-btn {
    font-size: 20px;
    cursor: pointer;
    color: #333;
    transition: color 0.3s;

    &:hover {
      color: #1a5fc5;
    }
  }
}

.header-right {
  display: flex;
  align-items: center;

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.3s;

    &:hover {
      background: #f5f7fa;
    }

    .user-name {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .user-role {
      font-size: 12px;
      color: #1a5fc5;
      background: #e8f0fa;
      padding: 2px 8px;
      border-radius: 10px;
    }
  }
}
</style>
