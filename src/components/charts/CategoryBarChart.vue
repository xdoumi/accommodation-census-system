<template>
  <div ref="chartRef" style="width: 100%; height: 320px;"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: { type: Array, default: () => [] },
  title: { type: String, default: '' },
})

const chartRef = ref(null)
let chart = null

function renderChart() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)

  const colors = ['#e6a23c', '#409eff', '#67c23a', '#9b59b6', '#909399']

  chart.setOption({
    title: { text: props.title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 50, bottom: 30 },
    xAxis: { type: 'category', data: props.data.map(d => d.name) },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: props.data.map((d, i) => ({ value: d.value, itemStyle: { color: colors[i % colors.length] } })),
      barWidth: '40%',
      label: { show: true, position: 'top', fontSize: 12 },
    }],
  })
}

onMounted(() => renderChart())
onUnmounted(() => chart?.dispose())
watch(() => props.data, () => renderChart(), { deep: true })

// 响应窗口变化
if (typeof window !== 'undefined') {
  const resize = () => chart?.resize()
  onMounted(() => window.addEventListener('resize', resize))
  onUnmounted(() => window.removeEventListener('resize', resize))
}
</script>
