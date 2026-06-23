/**
 * AI 客户端 - 统一 mock/real 模式
 * 所有 AI 服务通过此客户端调用，自动根据模式切换；含超时、重试、降级、埋点。
 */
import { useAiSettingsStore } from '@/stores/aiSettings'
import { route as mockRoute } from './mockEngine'
import { recordAiCall } from './metrics'

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_RETRIES = 1
const FAILOVER_EVENT = 'ai:failover'

function emitFailover(reason) {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(FAILOVER_EVENT, { detail: { reason } }))
  } catch { /* 忽略 */ }
}

/**
 * 统一聊天接口
 * @param {Object} options
 * @param {Array} options.messages
 * @param {boolean} options.stream
 * @param {Array} options.tools
 * @param {string} options.scenario
 * @param {AbortSignal} options.signal
 * @param {string} options.responseFormat - 'json_object' 强制 JSON
 * @param {boolean} options.forceMock - 强制走 mock
 */
export async function chat({ messages, stream = false, tools = [], scenario = '', signal, responseFormat, forceMock = false }) {
  const settings = useAiSettingsStore()
  const start = performance.now()

  const useReal = !forceMock && settings.mode === 'real' && settings.apiKey

  if (useReal) {
    try {
      const resp = await realChatWithRetry({ settings, messages, stream, tools, signal, responseFormat })
      recordAiCall({ scenario, mode: 'real', ms: Math.round(performance.now() - start), success: true })
      return resp
    } catch (e) {
      const ms = Math.round(performance.now() - start)
      recordAiCall({ scenario, mode: 'real', ms, success: false, error: e.message })
      console.warn('[AI] 真实模式失败，降级到模拟模式', e)
      emitFailover(e.message)
      // 继续降级到 mock
    }
  }

  // Mock 模式
  const mockStart = performance.now()
  try {
    const out = await mockRoute({ messages, tools, scenario, stream })
    recordAiCall({ scenario, mode: 'mock', ms: Math.round(performance.now() - mockStart), success: true })
    return out
  } catch (e) {
    recordAiCall({ scenario, mode: 'mock', ms: Math.round(performance.now() - mockStart), success: false, error: e.message })
    throw e
  }
}

/** 带重试的真实 API 调用 */
async function realChatWithRetry(opts) {
  let lastErr
  for (let attempt = 0; attempt <= DEFAULT_RETRIES; attempt++) {
    try {
      return await realChat(opts)
    } catch (e) {
      lastErr = e
      // 用户主动取消或鉴权错误不重试
      if (opts.signal?.aborted) throw e
      if (e.status && [400, 401, 403, 404, 422].includes(e.status)) throw e
      // 指数退避
      if (attempt < DEFAULT_RETRIES) {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
      }
    }
  }
  throw lastErr
}

/** 真实 LLM API 调用 */
async function realChat({ settings, messages, stream, tools, signal, responseFormat }) {
  const body = {
    model: settings.model,
    messages,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
    stream,
  }
  if (tools.length > 0) {
    body.tools = tools.map(t => ({ type: 'function', function: t }))
    body.tool_choice = 'auto'
  }
  if (responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' }
  }

  // 组合 abort signal —— 用户传入的 + 超时
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort)
  }
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Request timed out', 'AbortError')), DEFAULT_TIMEOUT_MS)

  let resp
  try {
    resp = await fetch(`${settings.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
    if (signal) signal.removeEventListener('abort', onAbort)
  }

  if (!resp.ok) {
    const errText = await resp.text()
    const err = new Error(`API Error ${resp.status}: ${errText.slice(0, 300)}`)
    err.status = resp.status
    throw err
  }

  if (stream) {
    return createStreamGenerator(resp)
  }

  const data = await resp.json()
  return normalizeResponse(data)
}

/** SSE 流式解析 */
async function* createStreamGenerator(resp) {
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta
          if (delta?.content) {
            yield { type: 'text', content: delta.content }
          }
          if (delta?.tool_calls) {
            yield { type: 'tool_call', tool_calls: delta.tool_calls }
          }
        } catch { /* 忽略解析错误 */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** 标准化 API 响应 */
function normalizeResponse(data) {
  const choice = data.choices?.[0]
  if (!choice) throw new Error('空响应')

  const message = choice.message
  const result = {
    content: message.content || '',
    toolCalls: [],
    usage: data.usage || null,
  }

  if (message.tool_calls) {
    result.toolCalls = message.tool_calls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }))
  }

  return result
}
