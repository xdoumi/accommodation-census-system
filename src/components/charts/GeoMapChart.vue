<template>
  <div>
    <div ref="chartRef" style="width: 100%; height: 500px;" v-loading="loading"></div>
    <div v-if="error" style="text-align:center; color:#909399; font-size: 12px; margin-top:6px;">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  /** ECharts 散点数据：{ name, value: [lng, lat, count], category? } */
  data: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  /** 是否显示 visualMap 颜色梯度 */
  showVisualMap: { type: Boolean, default: true },
})

const emit = defineEmits(['region-click'])

const chartRef = ref(null)
const loading = ref(false)
const error = ref('')
let chart = null
let geoReady = false

async function ensureGeo() {
  if (geoReady) return true
  try {
    const resp = await fetch('/geo/yunnan.json')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const geoJson = await resp.json()
    echarts.registerMap('yunnan', geoJson)
    geoReady = true
    error.value = ''
    return true
  } catch (e) {
    error.value = '地理底图加载失败，使用散点图替代展示'
    return false
  }
}

async function renderChart() {
  if (!chartRef.value) return
  loading.value = true
  try {
    const ok = await ensureGeo()
    if (!chart) {
      chart = echarts.init(chartRef.value)
      chart.on('click', (params) => {
        if (params.componentType === 'geo' || params.seriesType === 'map') {
          emit('region-click', { name: params.name, value: params.value })
        }
      })
    }

    const counts = props.data.map(d => d.value?.[2] || 0)
    const maxCount = Math.max(1, ...counts)

    const baseOption = {
      title: { text: props.title, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const v = params.value?.[2] ?? params.value ?? 0
          return `${params.name}：<b>${v}</b> 家`
        },
      },
    }

    if (props.showVisualMap) {
      baseOption.visualMap = {
        type: 'continuous',
        min: 0,
        max: maxCount,
        text: ['多', '少'],
        left: 16,
        bottom: 16,
        calculable: true,
        inRange: { color: ['#e8f0fa', '#79a7e8', '#1a5fc5', '#0e3f8f'] },
        textStyle: { fontSize: 11 },
      }
    }

    if (ok) {
      chart.setOption({
        ...baseOption,
        geo: {
          map: 'yunnan',
          roam: true,
          label: { show: true, fontSize: 10, color: '#1a1a1a' },
          itemStyle: { areaColor: '#f4f7fb', borderColor: '#a8c0e2' },
          emphasis: { itemStyle: { areaColor: '#cfe0f5' }, label: { fontWeight: 700 } },
        },
        series: [{
          name: '住宿单位',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: props.data,
          symbol: 'circle',
          symbolSize: (val) => Math.max(8, Math.min(36, Math.sqrt(val?.[2] || 1) * 5)),
          itemStyle: {
            color: '#1a5fc5',
            opacity: 0.85,
            shadowBlur: 10,
            shadowColor: 'rgba(26,95,197,0.5)',
          },
          rippleEffect: { brushType: 'stroke' },
          label: {
            show: true,
            formatter: (p) => p.value?.[2] || '',
            position: 'right',
            fontSize: 11,
            color: '#1a1a1a',
          },
        }],
      }, true)
    } else {
      // 降级：散点图
      chart.setOption({
        ...baseOption,
        title: { text: props.title + '（散点图模式）', left: 'center', textStyle: { fontSize: 14 } },
        xAxis: { type: 'value', name: '经度', min: 97, max: 106 },
        yAxis: { type: 'value', name: '纬度', min: 21, max: 30 },
        series: [{
          type: 'scatter',
          data: props.data,
          symbolSize: (val) => Math.max(val?.[2] || 4, 6),
          itemStyle: { color: '#1a5fc5', opacity: 0.7 },
        }],
      }, true)
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => renderChart())
onUnmounted(() => chart?.dispose())
watch(() => props.data, () => renderChart(), { deep: true })
watch(() => props.showVisualMap, () => renderChart())

if (typeof window !== 'undefined') {
  const resize = () => chart?.resize()
  onMounted(() => window.addEventListener('resize', resize))
  onUnmounted(() => window.removeEventListener('resize', resize))
}
</script>
