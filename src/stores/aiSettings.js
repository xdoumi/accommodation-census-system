import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'census_ai_settings'

function encode(s) { try { return btoa(unescape(encodeURIComponent(s))) } catch { return s } }
function decode(s) { try { return decodeURIComponent(escape(atob(s))) } catch { return s } }

export const useAiSettingsStore = defineStore('aiSettings', () => {
  const mode = ref('mock')                              // 'mock' | 'real'
  const baseURL = ref('https://api.deepseek.com/v1')
  const apiKey = ref('')
  const model = ref('deepseek-chat')
  const temperature = ref(0.7)
  const maxTokens = ref(2000)
  const streamEnabled = ref(true)
  const currentSessionId = ref('')

  // 功能开关（默认全部启用）
  const featureFlags = ref({
    voiceInput: true,
    vision: true,
    autocomplete: true,
    anomaly: true,
    chatBubble: true,
    planningAi: true,
    nlQuery: true,
    fieldExplain: true,
  })

  const fieldExplanationCache = ref({})

  const isRealMode = computed(() => mode.value === 'real' && apiKey.value)

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      mode.value = data.mode || 'mock'
      baseURL.value = data.baseURL || baseURL.value
      apiKey.value = data.apiKey ? decode(data.apiKey) : ''
      model.value = data.model || model.value
      temperature.value = data.temperature ?? 0.7
      maxTokens.value = data.maxTokens ?? 2000
      streamEnabled.value = data.streamEnabled ?? true
      if (data.featureFlags) Object.assign(featureFlags.value, data.featureFlags)
    } catch (e) {
      console.warn('[AI] 设置加载失败', e)
    }
  }

  function persistToLocalStorage() {
    const data = {
      mode: mode.value,
      baseURL: baseURL.value,
      apiKey: apiKey.value ? encode(apiKey.value) : '',
      model: model.value,
      temperature: temperature.value,
      maxTokens: maxTokens.value,
      streamEnabled: streamEnabled.value,
      featureFlags: featureFlags.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  async function testConnection() {
    if (!isRealMode.value) return { success: false, message: '请先填入 API Key 并切换到真实模式' }
    try {
      const resp = await fetch(`${baseURL.value}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.value}`,
        },
        body: JSON.stringify({
          model: model.value,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 10,
          stream: false,
        }),
      })
      if (!resp.ok) {
        const errText = await resp.text()
        return { success: false, message: `HTTP ${resp.status}: ${errText.slice(0, 200)}` }
      }
      return { success: true, message: '连接成功' }
    } catch (e) {
      return { success: false, message: '连接失败：' + e.message }
    }
  }

  function getEffectiveConfig() {
    return {
      mode: mode.value,
      baseURL: baseURL.value,
      apiKey: apiKey.value,
      model: model.value,
      temperature: temperature.value,
      maxTokens: maxTokens.value,
      stream: streamEnabled.value,
    }
  }

  function cacheFieldExplanation(field, content) {
    fieldExplanationCache.value[field] = content
  }

  function setMode(m) {
    mode.value = m
    persistToLocalStorage()
  }

  return {
    mode, baseURL, apiKey, model, temperature, maxTokens, streamEnabled,
    featureFlags, fieldExplanationCache, currentSessionId,
    isRealMode,
    loadFromLocalStorage, persistToLocalStorage, testConnection,
    getEffectiveConfig, cacheFieldExplanation, setMode,
  }
})
