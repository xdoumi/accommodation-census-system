<template>
  <div ref="chartRef" style="width: 100%; height: 320px;"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  xData: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  title: { type: String, default: '' },
})

const chartRef = ref(null)
let chart = null

function renderChart() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)

  chart.setOption({
    title: { text: props.title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { top: 30 },
    grid: { left: 60, right: 20, top: 60, bottom: 30 },
    xAxis: { type: 'category', data: props.xData, boundaryGap: false },
    yAxis: { type: 'value' },
    series: props.series.map(s => ({
      type: 'line',
      smooth: true,
      ...s,
    })),
  })
}

onMounted(() => renderChart())
onUnmounted(() => chart?.dispose())
watch(() => [props.xData, props.series], () => renderChart(), { deep: true })

if (typeof window !== 'undefined') {
  const resize = () => chart?.resize()
  onMounted(() => window.addEventListener('resize', resize))
  onUnmounted(() => window.removeEventListener('resize', resize))
}
</script>
