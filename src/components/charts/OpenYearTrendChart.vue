<template>
  <div ref="chartRef" style="width: 100%; height: 300px;"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  /** 住宿单位数组，需包含 openDate 字段 */
  accommodations: { type: Array, default: () => [] },
  title: { type: String, default: '开业年份分布' },
})

const chartRef = ref(null)
let chart = null

const aggregated = computed(() => {
  const map = {}
  for (const a of props.accommodations) {
    if (!a.openDate) continue
    const y = String(a.openDate).slice(0, 4)
    if (!/^\d{4}$/.test(y)) continue
    map[y] = (map[y] || 0) + 1
  }
  const years = Object.keys(map).sort()
  return { years, counts: years.map(y => map[y]) }
})

function renderChart() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)

  const { years, counts } = aggregated.value
  chart.setOption({
    title: { text: props.title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', formatter: '{b}年: 新增 {c} 家' },
    grid: { left: 50, right: 20, top: 50, bottom: 40 },
    xAxis: {
      type: 'category',
      data: years,
      axisLabel: { fontSize: 11, rotate: years.length > 12 ? 35 : 0 },
    },
    yAxis: { type: 'value', name: '新增数量' },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { color: '#1a5fc5', width: 2 },
      itemStyle: { color: '#1a5fc5' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(26,95,197,0.35)' },
          { offset: 1, color: 'rgba(26,95,197,0.02)' },
        ]),
      },
      data: counts,
    }],
  }, true)
}

onMounted(() => renderChart())
onUnmounted(() => chart?.dispose())
watch(() => props.accommodations, () => renderChart(), { deep: true })

if (typeof window !== 'undefined') {
  const resize = () => chart?.resize()
  onMounted(() => window.addEventListener('resize', resize))
  onUnmounted(() => window.removeEventListener('resize', resize))
}
</script>
