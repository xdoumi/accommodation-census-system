/**
 * 场景 2: 数据分析与洞察服务
 */
import { chat } from '../client'
import { PROMPTS } from '../prompts'
import { buildDataDigest } from '../contextBuilder'

/**
 * 自然语言查询
 */
export async function naturalLanguageQuery(question) {
  const digest = await buildDataDigest()
  const result = await chat({
    messages: [
      { role: 'system', content: PROMPTS.nlQuery + '\n数据摘要：' + JSON.stringify(digest) },
      { role: 'user', content: question },
    ],
    scenario: 'nl_query',
  })

  try {
    return JSON.parse(result.content)
  } catch {
    return { narrative: result.content, chartType: 'none', chartData: [], tableColumns: [], tableRows: [] }
  }
}

/**
 * 生成分析报告（流式）
 */
export async function generateReport(scope) {
  const digest = await buildDataDigest(scope)
  return await chat({
    messages: [
      { role: 'system', content: PROMPTS.generateReport + '\n数据摘要：' + JSON.stringify(digest) },
      { role: 'user', content: '请生成分析报告' },
    ],
    scenario: 'generate_report',
    stream: false,
  })
}

/**
 * 异常检测（全局）
 */
export async function detectAnomaliesGlobal() {
  const result = await chat({
    messages: [{ role: 'user', content: 'global' }],
    scenario: 'detect_anomalies_global',
  })

  try {
    return JSON.parse(result.content)
  } catch {
    return { anomalies: [], total: 0 }
  }
}

/**
 * 图表 AI 解读
 */
export async function commentOnChart(chartType, data, title = '') {
  const result = await chat({
    messages: [{ role: 'user', content: JSON.stringify({ chartType, data, title }) }],
    scenario: 'comment_chart',
  })

  return result.content
}

/**
 * 区域对比
 */
export async function compareAreas(codeA, codeB) {
  const result = await chat({
    messages: [{ role: 'user', content: JSON.stringify({ codeA, codeB }) }],
    scenario: 'compare_areas',
  })

  return result.content
}
