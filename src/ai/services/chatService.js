/**
 * 场景 3: 普查助手对话服务
 */
import { chat } from '../client'
import { PROMPTS } from '../prompts'
import { buildChatContext } from '../contextBuilder'
import { executeToolCall } from '../tools'
import db from '@/db'

/**
 * 发送聊天消息，返回流式响应
 * @param {string} text - 用户消息
 * @param {Array} history - 历史消息
 * @param {AbortSignal} signal - 取消信号
 * @returns {AsyncGenerator}
 */
export async function* sendMessage(text, history = [], signal) {
  const context = await buildChatContext()
  const systemMsg = PROMPTS.chat +
    `\n用户信息：${JSON.stringify(context.user)}` +
    `\n页面信息：${JSON.stringify(context.currentPage)}` +
    `\n数据摘要：${JSON.stringify(context.data)}`

  const messages = [
    { role: 'system', content: systemMsg },
    ...history.slice(-10), // 保留最近 10 条
    { role: 'user', content: text },
  ]

  // 从 client 获取流式响应
  const stream = await chat({
    messages,
    scenario: 'chat',
    stream: true,
    tools: [],
    signal,
  })

  let fullContent = ''
  let toolCalls = []

  for await (const chunk of stream) {
    if (chunk.type === 'text') {
      fullContent += chunk.content
      yield { type: 'text', content: chunk.content }
    } else if (chunk.type === 'tool_call') {
      toolCalls = chunk.tool_calls || []
    }
  }

  // 如果有工具调用，执行并继续
  for (const tc of toolCalls) {
    try {
      const result = await executeToolCall(tc)
      yield { type: 'tool_result', toolCall: tc, result }
    } catch (e) {
      yield { type: 'tool_error', toolCall: tc, error: e.message }
    }
  }

  // 保存到数据库
  const sessionId = generateSessionId()
  try {
    await db.aiChatMessages.add({
      sessionId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    })
    await db.aiChatMessages.add({
      sessionId,
      role: 'assistant',
      content: fullContent,
      createdAt: new Date().toISOString(),
    })
  } catch { /* 忽略存储错误 */ }
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
}