/**
 * AI 调用统计 / 埋点
 *
 * 收集每次 AI 调用的 scenario / mode / 耗时 / 成功失败，便于在 AI 设置页观察。
 */
import { ref, computed } from 'vue'

const MAX_RECENT = 100
const _records = ref([])              // 最近 N 条调用记录
const _counters = ref({})             // { scenario: { total, success, failed, totalLatency } }

export function recordAiCall({ scenario, mode, ms, success, error }) {
  const rec = {
    scenario,
    mode,
    ms,
    success,
    error: error || null,
    ts: Date.now(),
  }
  _records.value.unshift(rec)
  if (_records.value.length > MAX_RECENT) {
    _records.value.length = MAX_RECENT
  }
  const c = _counters.value[scenario] || { total: 0, success: 0, failed: 0, totalLatency: 0 }
  c.total++
  if (success) c.success++
  else c.failed++
  c.totalLatency += ms
  _counters.value[scenario] = c

  // 控制台简易日志
  const tag = success ? '✅' : '❌'
  console.debug(`[AI] ${tag} ${scenario} (${mode}) ${ms}ms`, error ? `err=${error}` : '')
}

export function useAiMetrics() {
  const recent = computed(() => _records.value)
  const summary = computed(() => {
    return Object.entries(_counters.value).map(([scenario, c]) => ({
      scenario,
      total: c.total,
      success: c.success,
      failed: c.failed,
      avgMs: c.total ? Math.round(c.totalLatency / c.total) : 0,
      successRate: c.total ? Math.round(c.success / c.total * 1000) / 10 : 0,
    }))
  })

  function reset() {
    _records.value = []
    _counters.value = {}
  }

  return { recent, summary, reset }
}
