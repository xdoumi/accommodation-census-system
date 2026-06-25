<template>
  <div class="page-container organization-page">
    <el-card shadow="never" class="toolbar-card">
      <div class="page-header">
        <div>
          <span class="page-title">组织机构管理</span>
          <p class="page-subtitle">按省厅、市州文旅局、县级文旅局、普查人员四级维护组织，并分配责任人员。</p>
        </div>
        <el-button
          type="primary"
          :icon="Plus"
          v-if="authStore.hasPermission('system:organization:create')"
          @click="openCreateDialog()"
        >
          新增组织
        </el-button>
      </div>
    </el-card>

    <div class="org-layout">
      <el-card shadow="never" class="tree-card">
        <template #header>
          <div class="card-header">
            <span>组织树</span>
            <el-button link type="primary" @click="loadData">刷新</el-button>
          </div>
        </template>
        <el-tree
          :data="treeRows"
          node-key="id"
          default-expand-all
          highlight-current
          :props="{ label: 'name', children: 'children' }"
          @node-click="selectOrganization"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <span>{{ data.name }}</span>
              <el-tag size="small" :type="levelTagType(data.level)">第{{ data.level }}级</el-tag>
            </span>
          </template>
        </el-tree>
      </el-card>

      <el-card shadow="never" class="detail-card">
        <template #header>
          <div class="card-header">
            <span>{{ activeOrg ? '组织详情' : '全部组织' }}</span>
            <div v-if="activeOrg" class="card-actions">
              <el-button
                size="small"
                type="primary"
                plain
                v-if="canCreateChild(activeOrg)"
                @click="openCreateDialog(activeOrg)"
              >
                新增下级
              </el-button>
              <el-button
                size="small"
                v-if="authStore.hasPermission('system:organization:update')"
                @click="openEditDialog(activeOrg)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                v-if="authStore.hasPermission('system:organization:delete')"
                @click="deleteOrganization(activeOrg)"
              >
                删除
              </el-button>
            </div>
          </div>
        </template>

        <el-descriptions v-if="activeOrg" :column="2" border>
          <el-descriptions-item label="组织名称" :span="2">{{ activeOrg.name }}</el-descriptions-item>
          <el-descriptions-item label="层级">第{{ activeOrg.level }}级</el-descriptions-item>
          <el-descriptions-item label="上级组织">{{ parentName(activeOrg.parentId) }}</el-descriptions-item>
          <el-descriptions-item label="关联区域">{{ activeOrg.areaName || areaStore.getAreaName(activeOrg.areaCode) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="activeOrg.status === 'active' ? 'success' : 'info'">{{ activeOrg.status === 'active' ? '启用' : '停用' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="责任人员" :span="2">{{ responsibleNames(activeOrg) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="2">{{ formatDateTime(activeOrg.updatedAt) }}</el-descriptions-item>
        </el-descriptions>

        <el-table v-else :data="flatRows" stripe border>
          <el-table-column prop="name" label="组织名称" min-width="220" show-overflow-tooltip />
          <el-table-column label="层级" width="90" align="center">
            <template #default="{ row }">第{{ row.level }}级</template>
          </el-table-column>
          <el-table-column label="关联区域" min-width="140">
            <template #default="{ row }">{{ row.areaName || areaStore.getAreaName(row.areaCode) || '-' }}</template>
          </el-table-column>
          <el-table-column label="责任人员" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ responsibleNames(row) || '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="selectOrganization(row)">查看</el-button>
              <el-button link type="primary" size="small" v-if="authStore.hasPermission('system:organization:update')" @click="openEditDialog(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑组织' : '新增组织'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="组织名称" prop="name">
          <el-input v-model.trim="form.name" placeholder="请输入组织名称" />
        </el-form-item>
        <el-form-item label="上级组织" prop="parentId">
          <el-select v-model="form.parentId" clearable placeholder="省级组织可不选上级" style="width: 100%" @change="syncLevelFromParent">
            <el-option
              v-for="item in parentOptions"
              :key="item.id"
              :label="`${item.name}（第${item.level}级）`"
              :value="item.id"
              :disabled="item.id === form.id || item.level >= 4"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="组织层级">
          <el-input :model-value="`第${form.level}级`" disabled />
        </el-form-item>
        <el-form-item label="关联区域">
          <el-select v-model="form.areaCode" filterable clearable placeholder="请选择关联区域" style="width: 100%" @change="syncAreaName">
            <el-option v-for="area in areaOptions" :key="area.code" :label="area.name" :value="area.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="责任人员">
          <el-select v-model="form.responsibleUserIds" multiple filterable placeholder="可按姓名、用户名搜索" style="width: 100%">
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="`${user.realName}（${user.username} · ${roleName(user.role)} · ${user.areaName || '-' }）`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import db from '@/db'
import { useAuthStore } from '@/stores/auth'
import { useAreaStore } from '@/stores/area'
import { getRoleLabel } from '@/utils/constants'
import { formatDateTime } from '@/utils/formatters'

const authStore = useAuthStore()
const areaStore = useAreaStore()

const organizations = ref([])
const users = ref([])
const activeOrg = ref(null)
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const form = reactive({
  id: null,
  name: '',
  parentId: null,
  level: 1,
  areaCode: '',
  areaName: '',
  responsibleUserIds: [],
  status: 'active',
})

const rules = {
  name: [{ required: true, message: '请输入组织名称', trigger: 'blur' }],
}

const flatRows = computed(() => organizations.value.slice().sort((a, b) => a.level - b.level || a.id - b.id))
const treeRows = computed(() => buildTree(flatRows.value))
const parentOptions = computed(() => flatRows.value.filter(item => item.level < 4))
const areaOptions = computed(() => areaStore.areas.filter(area => [1, 2, 3].includes(area.level)))

onMounted(loadData)

async function loadData() {
  await areaStore.fetchAreas()
  const [orgRows, userRows] = await Promise.all([
    db.organizations?.toArray() || [],
    db.users.toArray(),
  ])
  organizations.value = orgRows
  users.value = userRows.filter(user => user.status !== 'disabled')
  if (activeOrg.value) {
    activeOrg.value = organizations.value.find(item => item.id === activeOrg.value.id) || null
  }
}

function buildTree(rows) {
  const map = new Map(rows.map(row => [row.id, { ...row, children: [] }]))
  const roots = []
  map.forEach(row => {
    if (row.parentId && map.has(row.parentId)) map.get(row.parentId).children.push(row)
    else roots.push(row)
  })
  return roots
}

function selectOrganization(row) {
  activeOrg.value = organizations.value.find(item => item.id === row.id) || row
}

function openCreateDialog(parent = null) {
  Object.assign(form, {
    id: null,
    name: '',
    parentId: parent?.id || null,
    level: parent ? Math.min(Number(parent.level || 1) + 1, 4) : 1,
    areaCode: parent?.areaCode || '',
    areaName: parent?.areaName || '',
    responsibleUserIds: [],
    status: 'active',
  })
  dialogVisible.value = true
}

function openEditDialog(row) {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    parentId: row.parentId || null,
    level: row.level || 1,
    areaCode: row.areaCode || '',
    areaName: row.areaName || '',
    responsibleUserIds: parseIds(row.responsibleUserIds),
    status: row.status || 'active',
  })
  dialogVisible.value = true
}

function syncLevelFromParent(parentId) {
  const parent = organizations.value.find(item => item.id === parentId)
  form.level = parent ? Math.min(Number(parent.level || 1) + 1, 4) : 1
  if (parent && !form.areaCode) {
    form.areaCode = parent.areaCode || ''
    form.areaName = parent.areaName || ''
  }
}

function syncAreaName() {
  form.areaName = areaStore.getAreaName(form.areaCode) || ''
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (form.level > 4) {
    ElMessage.error('组织机构最多支持4级')
    return
  }
  submitting.value = true
  try {
    const now = new Date().toISOString()
    const payload = {
      name: form.name,
      parentId: form.parentId || null,
      level: form.level,
      areaCode: form.areaCode,
      areaName: form.areaName || areaStore.getAreaName(form.areaCode) || '',
      responsibleUserIds: JSON.stringify(form.responsibleUserIds || []),
      status: form.status,
      updatedAt: now,
    }
    if (form.id) {
      await db.organizations.update(form.id, payload)
      ElMessage.success('组织已更新')
    } else {
      await db.organizations.add({ ...payload, createdAt: now })
      ElMessage.success('组织已新增')
    }
    dialogVisible.value = false
    await loadData()
  } finally {
    submitting.value = false
  }
}

async function deleteOrganization(row) {
  const hasChildren = organizations.value.some(item => item.parentId === row.id)
  if (hasChildren) {
    ElMessage.warning('请先删除或调整下级组织')
    return
  }
  await ElMessageBox.confirm(`确定删除组织「${row.name}」吗？`, '删除确认', { type: 'warning' })
  await db.organizations.delete(row.id)
  ElMessage.success('组织已删除')
  activeOrg.value = null
  await loadData()
}

function canCreateChild(row) {
  return authStore.hasPermission('system:organization:create') && Number(row.level || 1) < 4
}

function parseIds(raw) {
  try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
}

function responsibleNames(row) {
  const ids = parseIds(row.responsibleUserIds)
  return ids.map(id => users.value.find(user => user.id === id)?.realName).filter(Boolean).join('、')
}

function parentName(parentId) {
  if (!parentId) return '无'
  return organizations.value.find(item => item.id === parentId)?.name || '-'
}

function roleName(role) {
  return getRoleLabel(role)
}

function levelTagType(level) {
  return ['', 'primary', 'success', 'warning', 'info'][level] || 'info'
}
</script>

<style scoped>
.organization-page {
  --brand: #1a5fc5;
}

.toolbar-card {
  margin-bottom: 14px;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #606266;
  font-size: 13px;
}

.org-layout {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 14px;
}

.tree-card,
.detail-card {
  min-height: 560px;
}

.card-header,
.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tree-node {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-right: 8px;
}

@media (max-width: 1100px) {
  .org-layout {
    grid-template-columns: 1fr;
  }
}
</style>
