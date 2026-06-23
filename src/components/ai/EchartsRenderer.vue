<template>
  <div ref="chartRef" style="width: 100%; height: 320px;"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  chartType: { type: String, default: 'bar' },
  data: { type: Array, default: () => [] },
  title: { type: String, default: '' },
})

const chartRef = ref(null)
let chart = null

function renderChart() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)

  let option = {
    title: { text: props.title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: {},
    grid: { left: 50, right: 20, top: props.title ? 50 : 30, bottom: 40 },
  }

  if (props.chartType === 'bar') {
    option.xAxis = { type: 'category', data: props.data.map(d => d.name) }
    option.yAxis = { type: 'value' }
    option.series = [{
      type: 'bar',
      data: props.data.map(d => d.value),
      itemStyle: { color: '#1a5fc5' },
      barWidth: '40%',
      label: { show: true, position: 'top', fontSize: 12 },
    }]
  } else if (props.chartType === 'pie') {
    option.tooltip = { trigger: 'item', formatter: '{b}: {c} ({d}%)' }
    option.legend = { orient: 'vertical', left: 'left', top: 'middle' }
    option.series = [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['60%', '50%'],
      data: props.data,
      label: { formatter: '{b}\n{d}%' },
    }]
  } else if (props.chartType === 'line') {
    option.xAxis = { type: 'category', data: props.data.map(d => d.name) }
    option.yAxis = { type: 'value' }
    option.series = [{
      type: 'line',
      smooth: true,
      data: props.data.map(d => d.value),
      lineStyle: { color: '#1a5fc5' },
      itemStyle: { color: '#1a5fc5' },
    }]
  }

  chart.setOption(option, true)
}

onMounted(() => renderChart())
onUnmounted(() => chart?.dispose())
watch(() => [props.chartType, props.data], () => renderChart(), { deep: true })

if (typeof window !== 'undefined') {
  const resize = () => chart?.resize()
  onMounted(() => window.addEventListener('resize', resize))
  onUnmounted(() => window.removeEventListener('resize', resize))
}
</script>