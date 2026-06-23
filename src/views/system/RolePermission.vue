<template>
  <div class="page-container">
    <el-card shadow="never">
      <div class="page-header">
        <span class="page-title">角色权限配置</span>
      </div>

      <el-table :data="rolePermissionData" stripe border>
        <el-table-column prop="roleName" label="角色" width="140" fixed />
        <el-table-column label="住宿单位管理" align="center">
          <el-table-column prop="accommodation_view" label="查看" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.accommodation_view ? '#67c23a' : '#f56c6c'"><Select v-if="row.accommodation_view" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
          <el-table-column prop="accommodation_create" label="新增" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.accommodation_create ? '#67c23a' : '#f56c6c'"><Select v-if="row.accommodation_create" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
          <el-table-column prop="accommodation_update" label="编辑" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.accommodation_update ? '#67c23a' : '#f56c6c'"><Select v-if="row.accommodation_update" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
          <el-table-column prop="accommodation_delete" label="删除" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.accommodation_delete ? '#67c23a' : '#f56c6c'"><Select v-if="row.accommodation_delete" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
          <el-table-column prop="accommodation_export" label="导出" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.accommodation_export ? '#67c23a' : '#f56c6c'"><Select v-if="row.accommodation_export" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
        </el-table-column>
        <el-table-column label="普查任务" align="center">
          <el-table-column prop="census_view" label="查看" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.census_view ? '#67c23a' : '#f56c6c'"><Select v-if="row.census_view" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
          <el-table-column prop="census_create" label="创建" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.census_create ? '#67c23a' : '#f56c6c'"><Select v-if="row.census_create" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
          <el-table-column prop="census_fill" label="填报" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.census_fill ? '#67c23a' : '#f56c6c'"><Select v-if="row.census_fill" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
          <el-table-column prop="census_review" label="审核" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.census_review ? '#67c23a' : '#f56c6c'"><Select v-if="row.census_review" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
        </el-table-column>
        <el-table-column label="数据统计" align="center">
          <el-table-column prop="statistics_view" label="查看" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.statistics_view ? '#67c23a' : '#f56c6c'"><Select v-if="row.statistics_view" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
          <el-table-column prop="statistics_export" label="导出" width="60" align="center">
            <template #default="{ row }"><el-icon :color="row.statistics_export ? '#67c23a' : '#f56c6c'"><Select v-if="row.statistics_export" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
        </el-table-column>
        <el-table-column label="系统管理" align="center">
          <el-table-column prop="system_user" label="用户管理" width="80" align="center">
            <template #default="{ row }"><el-icon :color="row.system_user ? '#67c23a' : '#f56c6c'"><Select v-if="row.system_user" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
          <el-table-column prop="system_role" label="角色权限" width="80" align="center">
            <template #default="{ row }"><el-icon :color="row.system_role ? '#67c23a' : '#f56c6c'"><Select v-if="row.system_role" /><CloseBold v-else /></el-icon></template>
          </el-table-column>
        </el-table-column>
      </el-table>

      <el-alert type="info" :closable="false" style="margin-top: 16px;">
        <p>说明：</p>
        <ul style="margin-left: 16px;">
          <li>超级管理员和省级管理员可查看全省数据</li>
          <li>市级管理员只能查看本市数据</li>
          <li>县级管理员和普查员只能查看本县区数据</li>
          <li>审核员可查看所负责市级范围内的数据</li>
          <li>权限配置为系统预设，当前版本暂不支持在线修改</li>
        </ul>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup>
import { ROLE_MAP } from '@/utils/constants'
import ROLE_PERMISSIONS from '@/utils/permission'

const rolePermissionData = Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => {
  const row = { role, roleName: ROLE_MAP[role] || role }
  // 展开权限码为布尔值
  row.accommodation_view = perms.includes('accommodation:view')
  row.accommodation_create = perms.includes('accommodation:create')
  row.accommodation_update = perms.includes('accommodation:update')
  row.accommodation_delete = perms.includes('accommodation:delete')
  row.accommodation_export = perms.includes('accommodation:export') || perms.includes('accommodation:import')
  row.census_view = perms.includes('census:view')
  row.census_create = perms.includes('census:create')
  row.census_fill = perms.includes('census:fill')
  row.census_review = perms.includes('census:review')
  row.statistics_view = perms.includes('statistics:view')
  row.statistics_export = perms.includes('statistics:export')
  row.system_user = perms.includes('system:user:view')
  row.system_role = perms.includes('system:role:view')
  return row
})
</script>
