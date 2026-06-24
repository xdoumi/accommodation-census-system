<template>
  <div class="page-container deleted-page">
    <el-card shadow="never" class="page-card">
      <div class="page-header">
        <div>
          <span class="page-title">删除管理</span>
          <p class="page-subtitle">单位列表和审核单位列表删除的记录会保存在这里，可按需恢复。</p>
        </div>
        <el-button :icon="Refresh" @click="loadRows">刷新</el-button>
      </div>

      <el-form :inline="true" :model="filters" class="filter-row">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="搜索单位名称或删除原因" style="width: 240px" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.type" clearable placeholder="全部类型" style="width: 160px">
            <el-option label="住宿单位列表" value="accommodation" />
            <el-option label="审核单位列表" value="censusRecord" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="applyFilters">查询</el-button>
          <el-button :icon="RefreshLeft" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <DataTable :data="pagedRows" :loading="loading" :pagination="pagination" @page-change="handlePageChange">
        <el-table-column prop="name" label="单位名称" min-width="200" show-overflow-tooltip />
        <el-table-column label="来源模块" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'accommodation' ? 'info' : 'warning'">
              {{ row.type === 'accommodation' ? '住宿单位列表' : '审核单位列表' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="删除原因" min-width="180" show-overflow-tooltip />
        <el-table-column prop="deletedByName" label="删除人" width="120" align="center" />
        <el-table-column label="删除时间" width="170" align="center">
          <template #default="{ row }">{{ formatDateTime(row.deletedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewItem(row)">查看</el-button>
            <el-button link type="success" size="small" @click="restoreItem(row)">恢复</el-button>
          </template>
        </el-table-column>
      </DataTable>
    </el-card>

    <el-drawer v-model="drawerVisible" title="删除记录详情" size="560px">
      <el-descriptions v-if="activeItem" :column="1" border>
        <el-descriptions-item label="单位名称">{{ activeItem.name }}</el-descriptions-item>
        <el-descriptions-item label="来源模块">{{ activeItem.type === 'accommodation' ? '住宿单位列表' : '审核单位列表' }}</el-descriptions-item>
        <el-descriptions-item label="删除原因">{{ activeItem.reason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="删除人">{{ activeItem.deletedByName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="删除时间">{{ formatDateTime(activeItem.deletedAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, RefreshLeft, Search } from '@element-plus/icons-vue'
import db from '@/db'
import { restoreDeletedItem } from '@/utils/accommodationWorkflow'
import { formatDateTime } from '@/utils/formatters'
import DataTable from '@/components/common/DataTable.vue'

const loading = ref(false)
const allRows = ref([])
const rows = ref([])
const activeItem = ref(null)
const drawerVisible = ref(false)
const filters = reactive({ keyword: '', type: '' })
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const pagedRows = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  return rows.value.slice(start, start + pagination.value.pageSize)
})

onMounted(loadRows)

async function loadRows() {
  loading.value = true
  try {
    allRows.value = (await db.deletedItems.toArray())
      .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
    applyFilters()
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  const kw = filters.keyword.trim().toLowerCase()
  rows.value = allRows.value.filter(row => {
    if (filters.type && row.type !== filters.type) return false
    if (kw && ![row.name, row.reason, row.deletedByName].some(value => String(value || '').toLowerCase().includes(kw))) return false
    return true
  })
  pagination.value.page = 1
  pagination.value.total = rows.value.length
}

function resetFilters() {
  filters.keyword = ''
  filters.type = ''
  applyFilters()
}

function handlePageChange({ page, pageSize }) {
  pagination.value.page = page
  pagination.value.pageSize = pageSize
}

function viewItem(row) {
  activeItem.value = row
  drawerVisible.value = true
}

async function restoreItem(row) {
  try {
    await ElMessageBox.confirm(`确定恢复「${row.name || '未命名单位'}」吗？`, '恢复确认', { type: 'warning' })
    await restoreDeletedItem(row)
    ElMessage.success('已恢复')
    await loadRows()
  } catch { /* cancel */ }
}
</script>

<style scoped>
.page-card {
  border: 1px solid #e8edf5;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 14px;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #606266;
}

.filter-row {
  padding: 12px 12px 0;
  margin-bottom: 12px;
  border-radius: 8px;
  background: #f8fafc;
}
</style>
