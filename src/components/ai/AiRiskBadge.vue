<template>
  <el-popover v-if="risks.length > 0" placement="bottom" :width="320" trigger="click">
    <template #reference>
      <el-tag :type="highestSeverity" effect="dark" style="cursor: pointer;">
        <el-icon><WarningFilled /></el-icon>
        风险预警：{{ risks.length }}
      </el-tag>
    </template>
    <div>
      <div style="font-weight: 600; margin-bottom: 8px; color: #1a5fc5;">AI 风险评估</div>
      <div v-for="(risk, idx) in risks" :key="idx" class="risk-item">
        <el-tag :type="risk.level === 'high' ? 'danger' : 'warning'" size="small">{{ risk.level === 'high' ? '高' : '中' }}</el-tag>
        <span style="font-size: 13px;">{{ risk.message }}</span>
        <div style="font-size: 12px; color: #909399; margin-top: 4px;">💡 {{ risk.action }}</div>
      </div>
    </div>
  </el-popover>
  <el-tag v-else type="success" effect="plain">
    <el-icon><CircleCheck /></el-icon> 任务进度正常
  </el-tag>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { WarningFilled, CircleCheck } from '@element-plus/icons-vue'
import { planning } from '@/ai'

const props = defineProps({
  taskId: { type: [Number, String], required: true },
})

const risks = ref([])

const highestSeverity = computed(() => {
  if (risks.value.some(r => r.level === 'high')) return 'danger'
  return 'warning'
})

async function loadRisks() {
  if (!props.taskId) return
  try {
    const result = await planning.assessTaskRisk(props.taskId)
    risks.value = result.risks || []
  } catch {
    risks.value = []
  }
}

onMounted(loadRisks)
watch(() => props.taskId, loadRisks)
</script>

<style lang="scss" scoped>
.risk-item {
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &:last-child { border-bottom: none; }
}
</style>