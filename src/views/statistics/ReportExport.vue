<template>
  <div class="page-container">
    <el-card shadow="never">
      <div class="page-header">
        <span class="page-title">报表导出</span>
      </div>

      <el-form :inline="true" :model="exportForm" style="margin-bottom: 20px;">
        <el-form-item label="导出类型">
          <el-select v-model="exportForm.type" style="width: 200px">
            <el-option label="住宿单位全量数据" value="full" />
            <el-option label="按类别导出" value="category" />
            <el-option label="按区域导出" value="region" />
            <el-option label="合规检查报表" value="compliance" />
          </el-select>
        </el-form-item>
        <el-form-item label="类别" v-if="exportForm.type === 'category'">
          <el-select v-model="exportForm.category" style="width: 160px">
            <el-option v-for="opt in CATEGORY_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域" v-if="exportForm.type === 'region'">
          <AreaCascader v-model="exportForm.areaCode" style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleExport" :loading="exporting">
            <el-icon><Download /></el-icon>导出 Excel
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 数据预览 -->
      <el-table :data="previewData" stripe border size="small" max-height="400">
        <el-table-column prop="name" label="单位名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="category" label="类别" width="100" align="center">
          <template #default="{ row }">{{ CATEGORY_MAP[row.category] }}</template>
        </el-table-column>
        <el-table-column prop="rooms" label="客房数" width="80" align="center" />
        <el-table-column prop="operatingStatus" label="经营状态" width="100" align="center">
          <template #default="{ row }">{{ OPERATING_STATUS_MAP[row.operatingStatus] }}</template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 12px; color: #909399; font-size: 13px;">
        预览显示前50条，导出将包含全部 {{ totalCount }} 条数据
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import db from '@/db'
import { useAuthStore } from '@/stores/auth'
import { useAreaStore } from '@/stores/area'
import { ElMessage } from 'element-plus'
import { exportToExcel, ACCOMMODATION_EXPORT_COLUMNS } from '@/utils/excel'
import { CATEGORY_OPTIONS, CATEGORY_MAP, OPERATING_STATUS_MAP } from '@/utils/constants'
import { filterByScope } from '@/utils/dataScope'
import AreaCascader from '@/components/common/AreaCascader.vue'

const authStore = useAuthStore()
const areaStore = useAreaStore()

const exporting = ref(false)
const previewData = ref([])
const totalCount = ref(0)

const exportForm = reactive({
  type: 'full',
  category: '',
  areaCode: '',
})

let allData = []

onMounted(async () => {
  await areaStore.fetchAreas()
  await loadPreview()
})

watch(() => [exportForm.type, exportForm.category, exportForm.areaCode], () => {
  loadPreview()
})

async function loadPreview() {
  const raw = (await db.accommodations.toArray()).filter(item => !item.deletedAt)
  // 统一走 dataScope 工具做权限范围过滤
  allData = filterByScope(raw, authStore.userRole, authStore.userAreaCode)

  // 类型过滤
  if (exportForm.type === 'category' && exportForm.category) {
    allData = allData.filter(a => a.category === exportForm.category)
  } else if (exportForm.type === 'region' && exportForm.areaCode) {
    allData = allData.filter(a =>
      a.countyCode === exportForm.areaCode || a.cityCode === exportForm.areaCode
    )
  } else if (exportForm.type === 'compliance') {
    allData = allData.filter(a => a.fireInspection !== 'passed' || a.healthPermit !== 'valid' || !a.hasEmergencyPlan)
  }

  totalCount.value = allData.length
  previewData.value = allData.slice(0, 50)
}

async function handleExport() {
  exporting.value = true
  try {
    const typeLabel = { full: '全量数据', category: '类别数据', region: '区域数据', compliance: '合规检查' }
    const filename = `住宿业${typeLabel[exportForm.type] || ''}报表_${new Date().toISOString().split('T')[0]}`

    let columns = ACCOMMODATION_EXPORT_COLUMNS
    if (exportForm.type === 'compliance') {
      columns = columns.filter(c => ['name', 'creditCode', 'category', 'cityCode', 'countyCode', 'detailAddress',
        'licenseStatus', 'fireInspection', 'healthPermit', 'safetyIncidents', 'hasEmergencyPlan', 'operatingStatus'].includes(c.key))
    }

    exportToExcel(allData, columns, filename)
    ElMessage.success(`已导出 ${allData.length} 条数据`)
  } finally {
    exporting.value = false
  }
}
</script>
