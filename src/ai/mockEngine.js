/**
 * Mock 引擎 - 根据 scenario 路由到不同的 mock 响应生成器
 */
import * as mockResponses from './mockResponses'

const SCENARIO_HANDLERS = {
  // 场景 1
  'parse_voice': mockResponses.parseVoiceToFields,
  'suggest_similar': mockResponses.suggestSimilarUnits,
  'detect_anomalies': mockResponses.detectAnomalies,
  'extract_photo': mockResponses.extractFromPhoto,
  'explain_field': mockResponses.explainField,

  // 场景 2
  'nl_query': mockResponses.nlQuery,
  'generate_report': mockResponses.generateReport,
  'detect_anomalies_global': mockResponses.detectAnomaliesGlobal,
  'comment_chart': mockResponses.commentOnChart,
  'compare_areas': mockResponses.compareAreas,

  // 场景 3
  'chat': mockResponses.chatResponse,

  // 场景 4
  'task_planning': mockResponses.suggestTaskPlan,
  'risk_assessment': mockResponses.assessTaskRisk,
}

export async function route({ messages, tools, scenario, stream }) {
  const handler = SCENARIO_HANDLERS[scenario]
  if (!handler) {
    return { content: '【模拟模式】未识别的场景：' + scenario, toolCalls: [] }
  }

  // 提取最后一条用户消息和上下文
  const userMsg = messages[messages.length - 1]
  const input = userMsg?.content || ''
  const context = parseContext(messages)

  // 调用对应的 mock 生成器
  const result = await handler(input, context, tools)

  if (stream) {
    return streamifyMock(result)
  }

  return result
}

/**
 * 把 mock 结果包装为流式（模拟流式效果）
 */
async function* streamifyMock(result) {
  if (result.toolCalls && result.toolCalls.length > 0) {
    yield { type: 'tool_call', tool_calls: result.toolCalls }
    return
  }

  const text = result.content || ''
  // 按句号/逗号分块
  const chunks = text.match(/[^，。！？\n]+[，。！？\n]?/g) || [text]
  for (const chunk of chunks) {
    yield { type: 'text', content: chunk }
    await new Promise(r => setTimeout(r, 50 + Math.random() * 80))
  }
}

/**
 * 从消息列表中提取上下文（user/system 消息）
 */
function parseContext(messages) {
  const ctx = { history: [] }
  for (const msg of messages) {
    if (msg.role === 'system') {
      ctx.system = msg.content
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      ctx.history.push(msg)
    }
  }
  return ctx
}
