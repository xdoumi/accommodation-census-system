/**
 * Function-calling 工具定义
 * 供 AI 调用以执行系统操作
 */
export const TOOLS = [
  {
    name: 'navigate_to',
    description: '导航到系统内的某个页面',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '路由路径，如 /accommodation、/census/create',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'query_accommodations',
    description: '查询住宿单位数据（返回数量和示例）',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: '类别筛选：star_hotel/non_star_hotel/minshuku/kezhan/other',
        },
        cityCode: {
          type: 'string',
          description: '市代码，如 520100 表示贵阳',
        },
        minAdr: {
          type: 'number',
          description: '最低平均房价',
        },
        keyword: {
          type: 'string',
          description: '关键词搜索（匹配名称）',
        },
      },
    },
  },
]

/**
 * 执行工具调用（在 mock 模式或真实模式下均可用）
 * @param {Object} toolCall - { name, arguments }
 * @returns {Promise<any>}
 */
export async function executeToolCall(toolCall) {
  const { name, arguments: rawArgs } = toolCall
  const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs

  switch (name) {
    case 'navigate_to': {
      const router = (await import('vue-router')).useRouter()
      router.push(args.path)
      return { success: true, message: `已跳转到 ${args.path}` }
    }

    case 'query_accommodations': {
      const db = (await import('@/db')).default
      let query = db.accommodations.toCollection()

      let filtered = await db.accommodations.toArray()
      if (args.category) filtered = filtered.filter(u => u.category === args.category)
      if (args.cityCode) filtered = filtered.filter(u => u.cityCode === args.cityCode)
      if (args.minAdr) filtered = filtered.filter(u => (u.adr || 0) >= args.minAdr)
      if (args.keyword) {
        const kw = args.keyword.toLowerCase()
        filtered = filtered.filter(u => u.name.toLowerCase().includes(kw))
      }
      return {
        total: filtered.length,
        sample: filtered.slice(0, 5).map(u => ({ name: u.name, category: u.category, adr: u.adr, rooms: u.rooms })),
      }
    }

    default:
      throw new Error(`未知工具: ${name}`)
  }
}
