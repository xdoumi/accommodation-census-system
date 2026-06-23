<template>
  <el-card shadow="hover" class="kpi-card" :body-style="{ padding: '20px' }">
    <div class="kpi-content">
      <div class="kpi-icon" :style="{ background: color + '20', color: color }">
        <el-icon :size="28"><component :is="icon" /></el-icon>
      </div>
      <div class="kpi-info">
        <div class="kpi-value">{{ displayValue }}</div>
        <div class="kpi-label">{{ label }}</div>
      </div>
      <div class="kpi-trend" v-if="trend">
        <span :class="trend === 'up' ? 'trend-up' : 'trend-down'">
          <el-icon><CaretTop v-if="trend === 'up'" /><CaretBottom v-else /></el-icon>
          {{ trendValue }}
        </span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber } from '@/utils/formatters'

const props = defineProps({
  icon: { type: String, default: 'DataLine' },
  value: { type: [Number, String], default: 0 },
  label: { type: String, default: '' },
  color: { type: String, default: '#409eff' },
  trend: { type: String, default: null },
  trendValue: { type: String, default: '' },
  formatter: { type: String, default: 'number' },
})

const displayValue = computed(() => {
  if (props.formatter === 'percent') return props.value + '%'
  if (props.formatter === 'currency') return '¥' + formatNumber(props.value)
  return formatNumber(props.value)
})
</script>

<style lang="scss" scoped>
.kpi-card {
  .kpi-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .kpi-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .kpi-info {
    flex: 1;
  }

  .kpi-value {
    font-size: 26px;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.2;
  }

  .kpi-label {
    font-size: 13px;
    color: #909399;
    margin-top: 4px;
  }

  .kpi-trend {
    font-size: 13px;

    .trend-up { color: #67c23a; }
    .trend-down { color: #f56c6c; }
  }
}
</style>
