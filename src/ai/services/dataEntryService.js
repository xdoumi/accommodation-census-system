/**
 * 场景 1: 智能填报辅助服务
 */
import { chat } from '../client'
import { PROMPTS } from '../prompts'
import { useAiSettingsStore } from '@/stores/aiSettings'
import { detectLocalAnomalies, mergeAnomalies } from '../anomalyRules'

/**
 * 语音/文本 → 表单字段
 */
export async function parseVoiceToFields(text) {
  const result = await chat({
    messages: [
      { role: 'system', content: PROMPTS.parseVoice },
      { role: 'user', content: text },
    ],
    scenario: 'parse_voice',
    responseFormat: 'json_object',
  })

  try {
    const parsed = JSON.parse(result.content)
    return parsed
  } catch {
    return { fields: {}, message: '解析失败' }
  }
}

/**
 * 相似单位推荐
 */
export async function suggestSimilarUnits(keyword) {
  const result = await chat({
    messages: [{ role: 'user', content: keyword }],
    scenario: 'suggest_similar',
    responseFormat: 'json_object',
  })

  try {
    return JSON.parse(result.content).suggestions || []
  } catch {
    return []
  }
}

/**
 * 异常检测：本地规则先跑（即时反馈），AI 作为补充
 */
export async function detectAnomalies(formData) {
  // 1. 本地规则 —— 同步、可靠、零成本
  const localIssues = detectLocalAnomalies(formData)

  // 2. AI 补充 —— 失败不影响本地结果
  let aiIssues = []
  try {
    const result = await chat({
      messages: [{ role: 'user', content: JSON.stringify(formData) }],
      scenario: 'detect_anomalies',
      responseFormat: 'json_object',
    })
    aiIssues = JSON.parse(result.content).issues || []
  } catch { /* AI 失败时静默回退到本地结果 */ }

  return mergeAnomalies(localIssues, aiIssues)
}

/**
 * 照片提取（vision）
 * @param {string} base64Image - data:image/...;base64,xxx 格式
 */
export async function extractFromPhoto(base64Image) {
  if (!base64Image) {
    return { fields: {}, message: '未提供图片' }
  }

  // OpenAI / DeepSeek-VL / 智谱 vision 的统一 multimodal 格式
  const userContent = [
    { type: 'text', text: '请识别图片中的住宿单位证照或门头信息，按要求字段提取为 JSON。' },
    { type: 'image_url', image_url: { url: base64Image } },
  ]

  const result = await chat({
    messages: [
      { role: 'system', content: PROMPTS.extractPhoto || '从图片中提取住宿单位关键信息，仅输出 JSON。' },
      { role: 'user', content: userContent },
    ],
    scenario: 'extract_photo',
    responseFormat: 'json_object',
  })

  try {
    return JSON.parse(result.content)
  } catch {
    return { fields: {}, message: '识别失败' }
  }
}

/**
 * 字段解释（带缓存）
 */
export async function explainField(fieldKey) {
  const settings = useAiSettingsStore()
  if (settings.fieldExplanationCache[fieldKey]) {
    return settings.fieldExplanationCache[fieldKey]
  }

  const result = await chat({
    messages: [{ role: 'user', content: fieldKey }],
    scenario: 'explain_field',
    responseFormat: 'json_object',
  })

  let explanation = ''
  try {
    const parsed = JSON.parse(result.content)
    explanation = parsed.explanation
  } catch {
    explanation = result.content
  }

  settings.cacheFieldExplanation(fieldKey, explanation)
  return explanation
}
