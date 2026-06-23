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

  chart.setOption({
    title: { text: props.title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left', top: 'middle', textStyle: { fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['60%', '55%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data: props.data,
    }],
  })
}

onMounted(() => renderChart())
onUnmounted(() => chart?.dispose())
watch(() => props.data, () => renderChart(), { deep: true })

if (typeof window !== 'undefined') {
  const resize = () => chart?.resize()
  onMounted(() => window.addEventListener('resize', resize))
  onUnmounted(() => window.removeEventListener('resize', resize))
}
</script>
