/**
 * 场景 4: AI 任务规划服务
 */
import { chat } from '../client'
import { PROMPTS } from '../prompts'

/**
 * AI 任务规划建议
 */
export async function suggestTaskPlan(taskInfo) {
  const result = await chat({
    messages: [
      { role: 'system', content: PROMPTS.taskPlanning },
      { role: 'user', content: JSON.stringify(taskInfo) },
    ],
    scenario: 'task_planning',
  })

  try {
    return JSON.parse(result.content)
  } catch {
    return null
  }
}

/**
 * 任务风险评估
 */
export async function assessTaskRisk(taskId) {
  const result = await chat({
    messages: [{ role: 'user', content: JSON.stringify({ taskId }) }],
    scenario: 'risk_assessment',
  })

  try {
    return JSON.parse(result.content)
  } catch {
    return { risks: [], summary: '' }
  }
}
