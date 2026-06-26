<template>
  <el-aside :width="collapsed ? '64px' : '220px'" class="app-sidebar">
    <div class="sidebar-logo">
      <el-icon :size="28" color="#409eff"><OfficeBuilding /></el-icon>
      <span v-show="!collapsed" class="logo-text">住宿业普查</span>
    </div>
    <el-menu
      :default-active="activeRoute"
      :collapse="collapsed"
      :collapse-transition="false"
      background-color="#001529"
      text-color="rgba(255,255,255,0.7)"
      active-text-color="#ffffff"
      router
    >
      <el-menu-item index="/dashboard">
        <el-icon><Odometer /></el-icon>
        <template #title>工作台</template>
      </el-menu-item>

      <el-sub-menu index="accommodation" v-if="authStore.hasPermission('accommodation:view')">
        <template #title>
          <el-icon><OfficeBuilding /></el-icon>
          <span>住宿单位</span>
        </template>
        <el-menu-item index="/accommodation">单位列表</el-menu-item>
        <el-menu-item index="/accommodation-import" v-if="authStore.hasPermission('accommodation:import')">批量导入</el-menu-item>
        <el-menu-item index="/accommodation-review" v-if="authStore.hasPermission('census:review')">审核单位列表</el-menu-item>
        <el-menu-item index="/accommodation-deleted" v-if="authStore.hasPermission('accommodation:delete')">删除管理</el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="census" v-if="authStore.hasPermission('census:view')">
        <template #title>
          <el-icon><List /></el-icon>
          <span>普查任务</span>
        </template>
        <el-menu-item index="/census">任务列表</el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="statistics" v-if="authStore.hasPermission('statistics:view')">
        <template #title>
          <el-icon><DataAnalysis /></el-icon>
          <span>数据统计</span>
        </template>
        <el-menu-item index="/statistics">统计概览</el-menu-item>
        <el-menu-item index="/statistics/map">地图分布</el-menu-item>
        <el-menu-item index="/statistics/report" v-if="authStore.hasPermission('statistics:export')">报表导出</el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="system" v-if="authStore.hasPermission('system:user:view') || authStore.hasPermission('system:role:view') || authStore.hasPermission('system:organization:view') || authStore.hasPermission('system:ai:manage')">
        <template #title>
          <el-icon><Setting /></el-icon>
          <span>系统管理</span>
        </template>
        <el-menu-item index="/system/users" v-if="authStore.hasPermission('system:user:view')">用户管理</el-menu-item>
        <el-menu-item index="/system/roles" v-if="authStore.hasPermission('system:role:view')">角色权限</el-menu-item>
        <el-menu-item index="/system/organizations" v-if="authStore.hasPermission('system:organization:view')">组织机构</el-menu-item>
        <el-menu-item index="/system/ai-settings" v-if="authStore.hasPermission('system:ai:manage')">AI 设置</el-menu-item>
      </el-sub-menu>
    </el-menu>
  </el-aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineProps({
  collapsed: Boolean,
})
defineEmits(['toggle'])

const route = useRoute()
const authStore = useAuthStore()

const activeRoute = computed(() => route.path)
</script>

<style lang="scss" scoped>
.app-sidebar {
  background-color: #001529;
  transition: width 0.3s;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .sidebar-logo {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0 16px;
    flex-shrink: 0;

    .logo-text {
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      white-space: nowrap;
    }
  }

  .el-menu {
    border-right: none;
    flex: 1;
    overflow-y: auto;
  }

  :deep(.el-menu-item.is-active) {
    background-color: #1a5fc5 !important;
  }

  :deep(.el-sub-menu__title:hover),
  :deep(.el-menu-item:hover) {
    background-color: rgba(255, 255, 255, 0.08) !important;
  }
}
</style>
