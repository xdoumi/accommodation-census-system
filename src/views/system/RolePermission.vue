<template>
  <div class="page-container role-permission-page">
    <el-card shadow="never" class="toolbar-card">
      <div class="page-header">
        <div>
          <span class="page-title">角色权限配置</span>
          <p class="page-subtitle">按“目录 - 按钮”配置菜单可见性和操作权限，保存后刷新或重新登录生效。</p>
        </div>
        <div class="header-actions">
          <el-button @click="resetDefault">恢复默认</el-button>
          <el-button type="primary" @click="saveConfig" v-if="authStore.hasPermission('system:role:update')">保存配置</el-button>
        </div>
      </div>
    </el-card>

    <div class="role-layout">
      <el-card shadow="never" class="role-panel">
        <template #header>
          <div class="card-header">
            <span>角色管理</span>
            <el-button size="small" type="primary" @click="openRoleDialog" v-if="authStore.hasPermission('system:role:create')">
              新增角色
            </el-button>
          </div>
        </template>

        <div class="role-list">
          <button
            v-for="role in roles"
            :key="role.value"
            type="button"
            class="role-item"
            :class="{ active: activeRole === role.value }"
            @click="activeRole = role.value"
          >
            <span>
              <strong>{{ role.label }}</strong>
              <small>{{ role.value }}</small>
            </span>
            <el-tag size="small" :type="isBuiltinRole(role.value) ? 'info' : 'success'">
              {{ isBuiltinRole(role.value) ? '内置' : '自定义' }}
            </el-tag>
          </button>
        </div>

        <el-button
          v-if="activeRole && !isBuiltinRole(activeRole) && authStore.hasPermission('system:role:delete')"
          type="danger"
          plain
          style="width: 100%; margin-top: 14px;"
          @click="deleteRole(activeRole)"
        >
          删除当前角色
        </el-button>
      </el-card>

      <el-card shadow="never" class="permission-panel">
        <template #header>
          <div class="card-header">
            <span>{{ activeRoleLabel }}权限</span>
            <div class="tree-actions">
              <el-button size="small" @click="checkAll">全选</el-button>
              <el-button size="small" @click="clearAll">清空</el-button>
            </div>
          </div>
        </template>

        <el-tree
          ref="permissionTreeRef"
          :data="PERMISSION_TREE"
          node-key="value"
          show-checkbox
          default-expand-all
          :props="{ label: 'label', children: 'children' }"
          :default-checked-keys="editableConfig[activeRole] || []"
          @check="handleTreeCheck"
        />
      </el-card>
    </div>

    <el-dialog v-model="roleDialogVisible" title="新增角色" width="420px">
      <el-form ref="roleFormRef" :model="roleForm" :rules="roleRules" label-width="90px">
        <el-form-item label="角色编码" prop="value">
          <el-input v-model="roleForm.value" placeholder="如 county_data_admin" />
        </el-form-item>
        <el-form-item label="角色名称" prop="label">
          <el-input v-model="roleForm.label" placeholder="请输入角色名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createRole">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BUILTIN_ROLE_KEYS, loadRoleOptions, saveRoleOptions } from '@/utils/constants'
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_TREE,
  loadRolePermissionConfig,
  resetRolePermissionConfig,
  saveRolePermissionConfig,
} from '@/utils/permission'

const authStore = useAuthStore()
const roles = ref(loadRoleOptions())
const activeRole = ref(roles.value[0]?.value || 'super_admin')
const editableConfig = reactive(buildInitialConfig())
const permissionTreeRef = ref(null)
const roleDialogVisible = ref(false)
const roleFormRef = ref(null)
const roleForm = reactive({ value: '', label: '' })

const roleRules = {
  value: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_:-]{2,31}$/, message: '编码需为3-32位小写字母、数字、下划线', trigger: 'blur' },
    { validator: validateRoleCode, trigger: 'blur' },
  ],
  label: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
}

const allPermissionKeys = computed(() => ALL_PERMISSIONS.map(item => item.value))
const activeRoleLabel = computed(() => roles.value.find(role => role.value === activeRole.value)?.label || activeRole.value)

watch(activeRole, () => syncTree(), { flush: 'post' })

function buildInitialConfig() {
  const configured = loadRolePermissionConfig() || DEFAULT_ROLE_PERMISSIONS
  return Object.fromEntries(
    roles.value.map(role => [role.value, [...(configured[role.value] || DEFAULT_ROLE_PERMISSIONS[role.value] || [])]]),
  )
}

function syncTree() {
  nextTick(() => {
    permissionTreeRef.value?.setCheckedKeys(editableConfig[activeRole.value] || [])
  })
}

function handleTreeCheck() {
  editableConfig[activeRole.value] = permissionTreeRef.value?.getCheckedKeys(true) || []
}

function checkAll() {
  editableConfig[activeRole.value] = [...allPermissionKeys.value]
  syncTree()
}

function clearAll() {
  editableConfig[activeRole.value] = []
  syncTree()
}

function saveConfig() {
  saveRoleOptions(roles.value)
  saveRolePermissionConfig(editableConfig)
  ElMessage.success('角色和权限配置已保存，刷新或重新登录后生效')
}

async function resetDefault() {
  await ElMessageBox.confirm('确定恢复系统默认角色和权限配置吗？自定义角色会被移除。', '恢复默认', { type: 'warning' })
  saveRoleOptions([])
  resetRolePermissionConfig()
  roles.value = loadRoleOptions()
  activeRole.value = roles.value[0]?.value || 'super_admin'
  Object.keys(editableConfig).forEach(key => delete editableConfig[key])
  Object.assign(editableConfig, buildInitialConfig())
  syncTree()
  ElMessage.success('已恢复默认配置')
}

function openRoleDialog() {
  roleForm.value = ''
  roleForm.label = ''
  roleDialogVisible.value = true
}

async function createRole() {
  const valid = await roleFormRef.value?.validate().catch(() => false)
  if (!valid) return
  roles.value.push({ value: roleForm.value, label: roleForm.label })
  editableConfig[roleForm.value] = ['dashboard:view']
  saveRoleOptions(roles.value)
  saveRolePermissionConfig(editableConfig)
  activeRole.value = roleForm.value
  roleDialogVisible.value = false
  ElMessage.success('角色已新增')
}

async function deleteRole(roleValue) {
  const role = roles.value.find(item => item.value === roleValue)
  await ElMessageBox.confirm(`确定删除角色「${role?.label || roleValue}」吗？已分配该角色的用户不会被自动删除。`, '删除角色', { type: 'warning' })
  roles.value = roles.value.filter(item => item.value !== roleValue)
  delete editableConfig[roleValue]
  saveRoleOptions(roles.value)
  saveRolePermissionConfig(editableConfig)
  activeRole.value = roles.value[0]?.value || ''
  ElMessage.success('角色已删除')
}

function isBuiltinRole(role) {
  return BUILTIN_ROLE_KEYS.includes(role)
}

function validateRoleCode(rule, value, callback) {
  if (roles.value.some(role => role.value === value)) callback(new Error('角色编码已存在'))
  else if (value === 'reviewer') callback(new Error('审核员角色已删除，请使用其他编码'))
  else callback()
}
</script>

<style lang="scss" scoped>
.toolbar-card {
  margin-bottom: 16px;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.header-actions,
.card-header,
.tree-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header {
  justify-content: space-between;
  width: 100%;
}

.role-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
}

.role-list {
  display: grid;
  gap: 8px;
}

.role-item {
  width: 100%;
  min-height: 56px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;

  strong,
  small {
    display: block;
  }

  strong {
    color: #1f2937;
    font-size: 14px;
  }

  small {
    margin-top: 3px;
    color: #8a94a6;
    font-size: 12px;
  }

  &.active {
    border-color: #1a5fc5;
    background: #f0f6ff;
  }
}

.permission-panel {
  min-height: 520px;
}

:deep(.el-tree-node__content) {
  min-height: 34px;
}

@media (max-width: 960px) {
  .role-layout {
    grid-template-columns: 1fr;
  }
}
</style>
