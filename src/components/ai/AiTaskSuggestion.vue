<template>
  <el-dialog :model-value="visible" title="AI 任务规划建议" width="700px" class="form-dialog" @update:model-value="$emit('update:visible', $event)">
    <div v-if="loading" style="text-align: center; padding: 40px;">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <p style="margin-top: 12px; color: #909399;">AI 正在分析历史数据和资源配置...</p>
    </div>

    <div v-if="suggestion && !loading">
      <!-- 推荐区域 -->
      <el-card shadow="never" style="margin-bottom: 12px;">
        <template #header>
          <span style="display: flex; align-items: center; gap: 6px;">
            <el-icon color="#e6a23c"><StarFilled /></el-icon> 优先普查区域
          </span>
        </template>
        <el-table :data="suggestion.priorityAreas || []" size="small" stripe>
          <el-table-column prop="name" label="区域" width="100" />
          <el-table-column prop="reason" label="推荐理由" min-width="200" show-overflow-tooltip />
          <el-table-column prop="score" label="优先级" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.score > 50 ? 'danger' : 'warning'" size="small">{{ row.score }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="$emit('accept', { areaCodes: [row.code] })">采用</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 推荐字段 -->
      <el-card shadow="never" style="margin-bottom: 12px;">
        <template #header>
          <span style="display: flex; align-items: center; gap: 6px;">
            <el-icon color="#409eff"><List /></el-icon> 推荐必填字段
          </span>
        </template>
        <el-tag v-for="field in suggestion.recommendedFields || []" :key="field" style="margin: 4px;">
          {{ fieldLabels[field] || field }}
        </el-tag>
        <el-button link type="primary" size="small" style="margin-left: 8px;" @click="$emit('accept', { requiredFields: suggestion.recommendedFields })">
          全部采用
        </el-button>
      </el-card>

      <!-- 推荐日期和普查员 -->
      <el-row :gutter="12">
        <el-col :span="12">
          <el-card shadow="never" style="margin-bottom: 12px;">
            <template #header>
              <span style="display: flex; align-items: center; gap: 6px;">
                <el-icon color="#67c23a"><Timer /></el-icon> 推荐截止日期
              </span>
            </template>
            <p style="font-size: 18px; font-weight: 600; color: #1a5fc5;">{{ suggestion.recommendedDeadline }}</p>
            <p style="font-size: 12px; color: #909399;">基于历史 {{ suggestion.avgHistoricalDays || 0 }} 天平均任务周期计算</p>
            <el-button link type="primary" size="small" @click="$emit('accept', { deadline: suggestion.recommendedDeadline })">
              采用此日期
            </el-button>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never" style="margin-bottom: 12px;">
            <template #header>
              <span style="display: flex; align-items: center; gap: 6px;">
                <el-icon color="#9b59b6"><User /></el-icon> 推荐普查员
              </span>
            </template>
            <div v-for="e in (suggestion.recommendedEnumerators || []).slice(0, 3)" :key="e.id" style="padding: 4px 0; font-size: 13px;">
              {{ e.name }}（{{ e.areaName }}）— {{ e.reason }}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 风险预警 -->
      <el-card v-if="suggestion.risks?.length > 0" shadow="never" style="margin-bottom: 12px; background: #fef0f0;">
        <template #header>
          <span style="display: flex; align-items: center; gap: 6px; color: #f56c6c;">
            <el-icon><WarningFilled /></el-icon> 风险预警
          </span>
        </template>
        <div v-for="risk in suggestion.risks" :key="risk.area" style="font-size: 13px; margin: 4px 0;">
          <el-tag size="small" :type="risk.probability === 'high' ? 'danger' : 'warning'" style="margin-right: 4px;">
            {{ risk.probability === 'high' ? '高风险' : '中风险' }}
          </el-tag>
          {{ risk.area }}：{{ risk.mitigation }}
        </div>
      </el-card>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Loading, StarFilled, WarningFilled } from '@element-plus/icons-vue'
import { planning } from '@/ai'

const props = defineProps({
  visible: { type: Boolean, default: false },
  taskInfo: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:visible', 'accept'])

const loading = ref(false)
const suggestion = ref(null)

const fieldLabels = {
  name: '单位名称', creditCode: '信用代码', category: '类别', rooms: '客房数', beds: '床位数',
  occupancyRate: '入住率', adr: '平均房价', revpar: 'RevPAR', annualRevenue: '年营收',
  staffCount: '从业人数', licenseStatus: '证照状态', fireInspection: '消防验收',
  healthPermit: '卫生许可', hasEmergencyPlan: '应急预案', operatingStatus: '经营状态',
  starRating: '星级', brandAffiliation: '品牌', onlineRating: '在线评分',
}

watch(() => props.visible, async (val) => {
  if (val) {
    loading.value = true
    suggestion.value = null
    try {
      suggestion.value = await planning.suggestTaskPlan(props.taskInfo)
    } catch {
      suggestion.value = {
        priorityAreas: [],
        recommendedFields: ['name', 'category', 'rooms', 'beds', 'occupancyRate', 'adr'],
        recommendedDeadline: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0],
        recommendedEnumerators: [],
        risks: [],
        avgHistoricalDays: 60,
      }
    } finally {
      loading.value = false
    }
  }
})
</script>