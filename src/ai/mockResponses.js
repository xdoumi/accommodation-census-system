/**
 * Mock 响应生成器 - 基于真实 IndexedDB 数据生成响应
 * 不是硬编码假数据，而是真实查询 + 模板化叙事
 */
import db from '@/db'
import { useAuthStore } from '@/stores/auth'
import { useAreaStore } from '@/stores/area'
import { CATEGORY_MAP, CATEGORY_OPTIONS, OPERATING_STATUS_MAP, LICENSE_STATUS_MAP, FIRE_INSPECTION_MAP, HEALTH_PERMIT_MAP, BRAND_OPTIONS, ROLE_MAP } from '@/utils/constants'
import { parseVoiceText } from './parsers'
import { GLOSSARY } from './glossary'
import { HELP_DOCS } from './helpDocs'

// ============ 场景 1：智能填报辅助 ============

/**
 * 语音/文本 → 表单字段
 */
export async function parseVoiceToFields(input) {
  const fields = parseVoiceText(input)
  const filledKeys = Object.keys(fields)

  if (filledKeys.length === 0) {
    return {
      content: JSON.stringify({ fields: {}, message: '未能识别有效信息，请尝试说明：星级、客房数、房价等关键信息' }),
      toolCalls: [],
    }
  }

  const summary = filledKeys.map(k => {
    const labelMap = {
      name: '单位名称', category: '类别', starRating: '星级', rooms: '客房数', beds: '床位数',
      adr: '平均房价', occupancyRate: '入住率', staffCount: '从业人数', detailAddress: '地址',
      operatingStatus: '经营状态', floorArea: '建筑面积',
      hasDining: '餐饮', hasParking: '停车', hasPool: '泳池', hasGym: '健身房',
    }
    return labelMap[k] || k
  }).join('、')

  return {
    content: JSON.stringify({
      fields,
      message: `已识别 ${filledKeys.length} 个字段：${summary}`,
    }),
    toolCalls: [],
  }
}

/**
 * 相似单位推荐
 */
export async function suggestSimilarUnits(input, context) {
  const keyword = input?.toLowerCase() || ''
  if (keyword.length < 2) return { content: JSON.stringify({ suggestions: [] }), toolCalls: [] }

  const authStore = useAuthStore()
  let units = await db.accommodations.toArray()

  // 权限范围过滤
  if (authStore.userRole === 'city_admin') {
    units = units.filter(u => u.cityCode === authStore.userAreaCode)
  } else if (['county_admin', 'enumerator'].includes(authStore.userRole)) {
    units = units.filter(u => u.countyCode === authStore.userAreaCode)
  }

  // 模糊匹配
  const matches = units
    .filter(u => u.name.toLowerCase().includes(keyword) ||
      (u.brandAffiliation && u.brandAffiliation.toLowerCase().includes(keyword)))
    .slice(0, 5)
    .map(u => ({
      id: u.id,
      name: u.name,
      category: u.category,
      categoryName: CATEGORY_MAP[u.category],
      detailAddress: u.detailAddress,
      rooms: u.rooms,
      starRating: u.starRating,
    }))

  return { content: JSON.stringify({ suggestions: matches }), toolCalls: [] }
}

/**
 * 异常检测
 */
export async function detectAnomalies(input) {
  const form = typeof input === 'string' ? JSON.parse(input || '{}') : input
  const issues = []

  // RevPAR > ADR
  if (form.revpar && form.adr && form.revpar > form.adr) {
    issues.push({
      field: 'revpar',
      severity: 'error',
      message: `RevPAR (¥${form.revpar}) 不应大于平均房价 ADR (¥${form.adr})`,
      suggestedValue: Math.round((form.adr * (form.occupancyRate || 50)) / 100),
      suggestion: `建议修正为 ¥${Math.round((form.adr * (form.occupancyRate || 50)) / 100)}（根据 ADR × 入住率 计算）`,
    })
  }

  // 入住率 > 100
  if (form.occupancyRate && form.occupancyRate > 100) {
    issues.push({
      field: 'occupancyRate',
      severity: 'error',
      message: `入住率 ${form.occupancyRate}% 超出 100% 上限`,
      suggestedValue: 100,
      suggestion: '建议修正为 ≤100%',
    })
  }

  // RevPAR 应约等于 ADR × 入住率
  if (form.adr && form.occupancyRate && form.revpar) {
    const expected = (form.adr * form.occupancyRate) / 100
    if (Math.abs(form.revpar - expected) / expected > 0.3) {
      issues.push({
        field: 'revpar',
        severity: 'warning',
        message: `RevPAR ¥${form.revpar} 与计算值 ¥${Math.round(expected)} 偏差较大`,
        suggestedValue: Math.round(expected),
        suggestion: `按 ADR × 入住率 计算，理论值为 ¥${Math.round(expected)}`,
      })
    }
  }

  // 大型酒店缺员工
  if (form.rooms > 30 && (!form.staffCount || form.staffCount === 0)) {
    issues.push({
      field: 'staffCount',
      severity: 'warning',
      message: `${form.rooms} 间客房通常需要至少 ${Math.ceil(form.rooms * 0.3)} 名员工`,
      suggestedValue: Math.ceil(form.rooms * 0.5),
      suggestion: '请补充从业人数',
    })
  }

  // 床位数应 ≥ 客房数
  if (form.rooms && form.beds && form.beds < form.rooms) {
    issues.push({
      field: 'beds',
      severity: 'warning',
      message: `床位数 ${form.beds} 少于客房数 ${form.rooms}，请确认`,
      suggestedValue: form.rooms * 2,
      suggestion: `建议床位数 ≥ 客房数（典型值 ${form.rooms * 2}）`,
    })
  }

  // 安全合规检查
  if (form.fireInspection === 'failed') {
    issues.push({
      field: 'fireInspection',
      severity: 'error',
      message: '消防验收未通过，存在安全隐患',
      suggestion: '请尽快整改并复验',
    })
  }
  if (form.healthPermit === 'expired') {
    issues.push({
      field: 'healthPermit',
      severity: 'error',
      message: '卫生许可证已过期',
      suggestion: '请联系当地卫健委办理续期',
    })
  }

  return { content: JSON.stringify({ issues, count: issues.length }), toolCalls: [] }
}

/**
 * 照片提取（模拟版：因为无法真实识别图片，返回合理的占位结果）
 */
export async function extractFromPhoto(input) {
  // 模拟识别延迟
  await new Promise(r => setTimeout(r, 800 + Math.random() * 800))

  // 从模板池随机选择（仿真模式下）
  const categories = ['star_hotel', 'non_star_hotel', 'minshuku']
  const names = ['黔灵山大酒店', '甲秀宾馆', '云岩民宿', '筑城酒店', '青岩客栈']
  const category = categories[Math.floor(Math.random() * categories.length)]
  const name = names[Math.floor(Math.random() * names.length)]

  return {
    content: JSON.stringify({
      fields: {
        name,
        category,
        creditCode: '91520100MA' + Math.random().toString(36).substr(2, 8).toUpperCase(),
        detailAddress: '贵州省贵阳市南明区某路' + Math.floor(Math.random() * 200 + 1) + '号',
      },
      confidence: 0.85,
      message: '【模拟识别】从图片中识别出营业执照信息',
    }),
    toolCalls: [],
  }
}

/**
 * 字段解释
 */
export async function explainField(input) {
  const key = typeof input === 'string' ? input : input?.field
  const def = GLOSSARY[key]
  if (def) {
    return { content: JSON.stringify({ explanation: def }), toolCalls: [] }
  }
  return { content: JSON.stringify({ explanation: `字段「${key}」是住宿单位普查的标准指标之一，请按实际情况如实填写。` }), toolCalls: [] }
}

// ============ 场景 2：数据分析与洞察 ============

/**
 * 自然语言查询
 */
export async function nlQuery(question) {
  const authStore = useAuthStore()
  const areaStore = useAreaStore()
  await areaStore.fetchAreas()
  let allUnits = await db.accommodations.toArray()

  // 权限过滤
  if (authStore.userRole === 'city_admin') {
    allUnits = allUnits.filter(u => u.cityCode === authStore.userAreaCode)
  } else if (['county_admin', 'enumerator'].includes(authStore.userRole)) {
    allUnits = allUnits.filter(u => u.countyCode === authStore.userAreaCode)
  }

  // 意图识别
  const q = question.toLowerCase()

  // 类别筛选
  let filtered = allUnits
  let filterDesc = []
  if (q.includes('星级') || q.includes('5星') || q.includes('五星')) {
    filtered = filtered.filter(u => u.starRating === 5)
    filterDesc.push('五星级')
  } else if (q.includes('四星')) {
    filtered = filtered.filter(u => u.starRating === 4); filterDesc.push('四星级')
  } else if (q.includes('三星')) {
    filtered = filtered.filter(u => u.starRating === 3); filterDesc.push('三星级')
  }
  if (q.includes('民宿')) { filtered = filtered.filter(u => u.category === 'minshuku'); filterDesc.push('民宿') }
  if (q.includes('客栈')) { filtered = filtered.filter(u => u.category === 'kezhan'); filterDesc.push('客栈') }
  if (q.includes('酒店') && !filterDesc.length) { filtered = filtered.filter(u => ['star_hotel', 'non_star_hotel'].includes(u.category)); filterDesc.push('酒店') }

  // 区域筛选
  const cityMatches = ['贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁', '黔西南', '黔东南', '黔南']
  const cityCodeMap = {
    贵阳: '520100',
    六盘水: '520200',
    遵义: '520300',
    安顺: '520400',
    毕节: '520500',
    铜仁: '520600',
    黔西南: '522300',
    黔东南: '522600',
    黔南: '522700',
  }
  let cityFilter = ''
  for (const c of cityMatches) {
    if (q.includes(c)) {
      filtered = filtered.filter(u => u.cityCode === cityCodeMap[c])
      cityFilter = c + '市'
      break
    }
  }

  // 意图分类：统计、平均、最大、对比
  const isAvg = q.includes('平均') || q.includes('均价')
  const isMax = q.includes('最高') || q.includes('最大')
  const isCount = q.includes('多少') || q.includes('几')

  // 计算统计
  const count = filtered.length
  const totalRooms = filtered.reduce((s, u) => s + (u.rooms || 0), 0)
  const operatingUnits = filtered.filter(u => u.operatingStatus === 'operating')
  const avgAdr = operatingUnits.length ? Math.round(operatingUnits.reduce((s, u) => s + (u.adr || 0), 0) / operatingUnits.length) : 0
  const avgOccupancy = operatingUnits.length ? Math.round(operatingUnits.reduce((s, u) => s + (u.occupancyRate || 0), 0) / operatingUnits.length * 10) / 10 : 0
  const maxAdr = filtered.reduce((max, u) => (u.adr || 0) > max.adr ? { adr: u.adr, name: u.name } : max, { adr: 0, name: '' })

  // 构建图表数据
  let chartType = 'none'
  let chartData = []
  let tableColumns = []
  let tableRows = []

  if (q.includes('对比') || q.includes('差异') || q.includes('vs') || q.includes('和')) {
    // 区域对比 - 取所有匹配城市
    const cityStats = {}
    for (const c of cityMatches) {
      if (q.includes(c)) {
        const units = allUnits.filter(u => u.cityCode === cityCodeMap[c])
        cityStats[c + '市'] = units.length
      }
    }
    if (Object.keys(cityStats).length > 0) {
      chartType = 'bar'
      chartData = Object.entries(cityStats).map(([name, value]) => ({ name, value }))
    }
  } else if (q.includes('分布') || q.includes('占比')) {
    chartType = 'pie'
    const catStats = {}
    filtered.forEach(u => { catStats[CATEGORY_MAP[u.category]] = (catStats[CATEGORY_MAP[u.category]] || 0) + 1 })
    chartData = Object.entries(catStats).map(([name, value]) => ({ name, value }))
  } else if (count > 0 && count <= 50 && (filterDesc.length > 0 || cityFilter)) {
    // 表格展示
    tableColumns = [
      { prop: 'name', label: '单位名称' },
      { prop: 'rooms', label: '客房' },
      { prop: 'adr', label: '均价' },
      { prop: 'occupancyRate', label: '入住率' },
    ]
    tableRows = filtered.slice(0, 20).map(u => ({
      name: u.name,
      rooms: u.rooms,
      adr: '¥' + u.adr,
      occupancyRate: u.occupancyRate + '%',
    }))
  }

  // 构建叙事
  const scope = (cityFilter ? cityFilter : (authStore.currentUser?.areaName || '全省')) + filterDesc.join('')
  let narrative = ''

  if (count === 0) {
    narrative = `根据您的查询条件，未在${scope}找到匹配的住宿单位。`
  } else if (isAvg && avgAdr) {
    narrative = `${scope}共有 **${count}** 家住宿单位，平均房价为 **¥${avgAdr}**，平均入住率 **${avgOccupancy}%**。`
    if (maxAdr.name) narrative += `其中房价最高的是「${maxAdr.name}」，达 ¥${maxAdr.adr}。`
  } else if (isMax && maxAdr.name) {
    narrative = `${scope}中房价最高的是「${maxAdr.name}」，达 **¥${maxAdr.adr}**。共有 ${count} 家相关单位。`
  } else if (isCount) {
    narrative = `${scope}共有 **${count}** 家住宿单位，总客房数 **${totalRooms}** 间。`
    if (avgAdr) narrative += `平均房价 ¥${avgAdr}，平均入住率 ${avgOccupancy}%。`
  } else {
    narrative = `${scope}相关数据：共 ${count} 家单位，${totalRooms} 间客房`
    if (avgAdr) narrative += `，平均房价 ¥${avgAdr}，平均入住率 ${avgOccupancy}%`
    narrative += '。'
  }

  return {
    content: JSON.stringify({
      narrative,
      chartType,
      chartData,
      tableColumns,
      tableRows,
      stats: { count, totalRooms, avgAdr, avgOccupancy },
    }),
    toolCalls: [],
  }
}

/**
 * 生成分析报告
 */
export async function generateReport(input) {
  const authStore = useAuthStore()
  let allUnits = await db.accommodations.toArray()
  if (authStore.userRole === 'city_admin') {
    allUnits = allUnits.filter(u => u.cityCode === authStore.userAreaCode)
  }

  const total = allUnits.length
  const byCategory = {}
  CATEGORY_OPTIONS.forEach(c => { byCategory[c.label] = allUnits.filter(u => u.category === c.value).length })
  const operatingCount = allUnits.filter(u => u.operatingStatus === 'operating').length
  const closedCount = allUnits.filter(u => u.operatingStatus === 'closed').length
  const avgAdr = Math.round(allUnits.reduce((s, u) => s + (u.adr || 0), 0) / Math.max(allUnits.length, 1))
  const avgOcc = Math.round(allUnits.reduce((s, u) => s + (u.occupancyRate || 0), 0) / Math.max(allUnits.length, 1) * 10) / 10
  const fireFailedCount = allUnits.filter(u => u.fireInspection === 'failed').length
  const noLicenseCount = allUnits.filter(u => u.licenseStatus === 'none').length

  const topCategory = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0]
  const scope = authStore.currentUser?.areaName || '全省'

  const report = `# ${scope}住宿业普查分析报告

**生成时间：** ${new Date().toLocaleDateString('zh-CN')}
**数据范围：** ${scope}

## 一、总体概况

截至本报告生成时，${scope}范围内共有住宿业单位 **${total}** 家，其中正常营业 ${operatingCount} 家（${Math.round(operatingCount / total * 100)}%），停业 ${closedCount} 家。从业态结构看，**${topCategory[0]}**是数量最多的业态，共 ${topCategory[1]} 家，占比 ${Math.round(topCategory[1] / total * 100)}%。

## 二、规模与业态结构

各业态分布情况如下：

${Object.entries(byCategory).map(([name, count]) => `- **${name}**：${count} 家（${Math.round(count / total * 100)}%）`).join('\n')}

数据显示，${scope}的住宿业态呈现多元化发展态势，传统星级酒店与新兴民宿、客栈并存，能够满足不同层次游客的住宿需求。

## 三、经营情况

- **平均房价（ADR）：** ¥${avgAdr}
- **平均入住率：** ${avgOcc}%
- **总客房数：** ${allUnits.reduce((s, u) => s + (u.rooms || 0), 0)} 间
- **总床位数：** ${allUnits.reduce((s, u) => s + (u.beds || 0), 0)} 张
- **从业人员：** ${allUnits.reduce((s, u) => s + (u.staffCount || 0), 0)} 人

总体来看，${avgOcc > 60 ? '入住率处于较好水平，行业运行平稳' : '入住率仍有提升空间，建议加强营销推广'}。

## 四、合规与安全

- **未办证单位：** ${noLicenseCount} 家（占比 ${Math.round(noLicenseCount / total * 100)}%）
- **消防验收未通过：** ${fireFailedCount} 家

${fireFailedCount > 0 || noLicenseCount > 5
  ? `**重点关注：** 存在一定数量的合规风险，建议组织专项整治行动，重点督促未办证及消防不达标单位限期整改。`
  : `合规情况总体良好，无重大隐患。`}

## 五、问题与建议

1. **强化日常监管：** 建立定期普查与突击检查相结合的常态化监管机制
2. **优化业态结构：** 在保障基础供给的同时，鼓励特色民宿、文化主题酒店发展
3. **提升数字化水平：** 推动住宿单位接入在线平台，提高经营透明度
4. **加强行业培训：** 针对从业人员开展服务规范、安全管理等专项培训

---
*本报告由 AI 自动生成，数据基于普查系统实时数据，仅供参考。*`

  return { content: report, toolCalls: [] }
}

/**
 * 全局异常数据列表
 */
export async function detectAnomaliesGlobal() {
  const authStore = useAuthStore()
  let units = await db.accommodations.toArray()
  if (authStore.userRole === 'city_admin') units = units.filter(u => u.cityCode === authStore.userAreaCode)
  if (['county_admin', 'enumerator'].includes(authStore.userRole)) units = units.filter(u => u.countyCode === authStore.userAreaCode)

  const anomalies = []

  for (const u of units) {
    if (u.fireInspection === 'failed') {
      anomalies.push({ id: u.id, name: u.name, type: '消防', severity: 'error', message: '消防验收未通过' })
    }
    if (u.healthPermit === 'expired') {
      anomalies.push({ id: u.id, name: u.name, type: '卫生', severity: 'error', message: '卫生许可已过期' })
    }
    if (u.licenseStatus === 'none' && u.operatingStatus === 'operating') {
      anomalies.push({ id: u.id, name: u.name, type: '证照', severity: 'warning', message: '正常营业但未办证' })
    }
    if (u.operatingStatus === 'operating' && (u.occupancyRate || 0) === 0) {
      anomalies.push({ id: u.id, name: u.name, type: '数据', severity: 'warning', message: '入住率为 0，请核实' })
    }
    if (u.adr && u.revpar && u.revpar > u.adr) {
      anomalies.push({ id: u.id, name: u.name, type: '数据', severity: 'warning', message: `RevPAR(¥${u.revpar}) > ADR(¥${u.adr})` })
    }
    if (u.safetyIncidents > 0) {
      anomalies.push({ id: u.id, name: u.name, type: '安全', severity: 'error', message: `近一年发生 ${u.safetyIncidents} 起安全事故` })
    }
  }

  return { content: JSON.stringify({ anomalies: anomalies.slice(0, 50), total: anomalies.length }), toolCalls: [] }
}

/**
 * 图表 AI 解读
 */
export async function commentOnChart(input) {
  const params = typeof input === 'string' ? JSON.parse(input || '{}') : input
  const { chartType, data, title } = params

  if (!data || data.length === 0) return { content: '暂无数据可供分析', toolCalls: [] }

  const sorted = [...data].sort((a, b) => b.value - a.value)
  const total = data.reduce((s, d) => s + d.value, 0)
  const max = sorted[0]
  const min = sorted[sorted.length - 1]

  let comment = ''
  if (chartType === 'pie' || chartType === 'bar') {
    const maxPct = Math.round((max.value / total) * 100)
    comment = `「${max.name}」占比最高（${max.value}，${maxPct}%）`
    if (data.length > 1) {
      comment += `，是「${min.name}」（${min.value}）的 ${Math.round(max.value / Math.max(min.value, 1))} 倍`
    }
    comment += '。'

    if (maxPct > 50) {
      comment += `整体分布较为集中，建议关注其他类别的均衡发展。`
    } else if (maxPct < 30) {
      comment += `分布较为均衡，结构合理。`
    }
  } else if (chartType === 'line') {
    comment = `数据整体趋势：最高 ${max.value}（${max.name}），最低 ${min.value}（${min.name}）。`
  }

  return { content: comment, toolCalls: [] }
}

/**
 * 区域对比
 */
export async function compareAreas(input) {
  const params = typeof input === 'string' ? JSON.parse(input || '{}') : input
  const { codeA, codeB } = params
  if (!codeA || !codeB) return { content: '请选择两个区域进行对比', toolCalls: [] }

  const areaStore = useAreaStore()
  await areaStore.fetchAreas()
  const nameA = areaStore.getAreaName(codeA)
  const nameB = areaStore.getAreaName(codeB)

  const unitsA = await getUnitsByArea(codeA)
  const unitsB = await getUnitsByArea(codeB)

  const statsA = computeStats(unitsA)
  const statsB = computeStats(unitsB)

  const comparison = `## ${nameA} vs ${nameB} 对比分析

### 总体规模
- **${nameA}：** ${statsA.count} 家单位，${statsA.totalRooms} 间客房
- **${nameB}：** ${statsB.count} 家单位，${statsB.totalRooms} 间客房
- ${statsA.count > statsB.count ? `${nameA} 单位数量多 ${statsA.count - statsB.count} 家` : `${nameB} 单位数量多 ${statsB.count - statsA.count} 家`}

### 经营指标
- **平均房价：** ${nameA} ¥${statsA.avgAdr} vs ${nameB} ¥${statsB.avgAdr}（差 ¥${Math.abs(statsA.avgAdr - statsB.avgAdr)}）
- **平均入住率：** ${nameA} ${statsA.avgOcc}% vs ${nameB} ${statsB.avgOcc}%
- **从业人员：** ${nameA} ${statsA.totalStaff} 人 vs ${nameB} ${statsB.totalStaff} 人

### 业态结构
- ${nameA} 主导业态：${statsA.topCategory}
- ${nameB} 主导业态：${statsB.topCategory}

### 综合评估
${statsA.avgAdr > statsB.avgAdr * 1.2 ? `${nameA} 房价显著高于 ${nameB}，可能反映出 ${nameA} 高端酒店占比更高或市场定位偏中高端。` : statsB.avgAdr > statsA.avgAdr * 1.2 ? `${nameB} 房价显著高于 ${nameA}。` : '两地房价水平相当。'}
${statsA.avgOcc > statsB.avgOcc + 10 ? `${nameA} 入住率明显高于 ${nameB}，市场需求更旺盛。` : statsB.avgOcc > statsA.avgOcc + 10 ? `${nameB} 入住率明显高于 ${nameA}。` : '两地入住率相近。'}`

  return { content: comparison, toolCalls: [] }
}

async function getUnitsByArea(code) {
  let units = await db.accommodations.toArray()
  if (code.length === 6 && code.endsWith('00')) {
    // 市级
    units = units.filter(u => u.cityCode === code)
  } else {
    units = units.filter(u => u.countyCode === code)
  }
  return units
}

function computeStats(units) {
  const count = units.length
  if (count === 0) return { count: 0, totalRooms: 0, avgAdr: 0, avgOcc: 0, totalStaff: 0, topCategory: '无' }

  const totalRooms = units.reduce((s, u) => s + (u.rooms || 0), 0)
  const totalStaff = units.reduce((s, u) => s + (u.staffCount || 0), 0)
  const operating = units.filter(u => u.operatingStatus === 'operating')
  const avgAdr = operating.length ? Math.round(operating.reduce((s, u) => s + (u.adr || 0), 0) / operating.length) : 0
  const avgOcc = operating.length ? Math.round(operating.reduce((s, u) => s + (u.occupancyRate || 0), 0) / operating.length * 10) / 10 : 0

  const catCounts = {}
  units.forEach(u => { catCounts[u.category] = (catCounts[u.category] || 0) + 1 })
  const top = Object.entries(catCounts).sort(([, a], [, b]) => b - a)[0]
  const topCategory = top ? CATEGORY_MAP[top[0]] : '无'

  return { count, totalRooms, avgAdr, avgOcc, totalStaff, topCategory }
}

// ============ 场景 3：聊天助手 ============

/**
 * 聊天响应
 */
export async function chatResponse(input, context) {
  const text = input.toLowerCase()

  // 1. 数据查询类
  if (/多少|数量|几个|几家/.test(text)) {
    return await chatDataQuery(input)
  }

  // 2. 解释类
  if (/什么是|含义|意思|解释|说明/.test(text)) {
    return chatGlossary(input)
  }

  // 3. 操作指引类
  if (/怎么|如何|怎样|怎么样/.test(text)) {
    return chatHowTo(input)
  }

  // 4. 动作请求
  if (/创建|新建|生成.*任务|帮我/.test(text)) {
    return chatAction(input)
  }

  // 5. 导航请求
  if (/打开|跳转|前往|查看.*页/.test(text)) {
    return chatNavigate(input)
  }

  // 6. 政策类
  if (/政策|规定|法规|标准/.test(text)) {
    return chatPolicy(input)
  }

  // 默认响应
  return {
    content: `您好！我是住宿业普查 AI 助手。我可以帮您：\n\n📊 **查询数据**：如"我管辖区有多少民宿"\n📖 **解释术语**：如"什么是 RevPAR"\n🎯 **操作指引**：如"如何创建普查任务"\n⚙️ **执行操作**：如"帮我创建一个民宿专项普查"\n\n请告诉我您想了解什么？`,
    toolCalls: [],
  }
}

async function chatDataQuery(question) {
  const result = await nlQuery(question)
  const parsed = JSON.parse(result.content)
  return {
    content: parsed.narrative + (parsed.stats?.count > 0 && parsed.stats?.avgAdr ? `\n\n📊 关键指标：共 ${parsed.stats.count} 家 · 平均房价 ¥${parsed.stats.avgAdr} · 平均入住率 ${parsed.stats.avgOccupancy}%` : ''),
    toolCalls: [],
  }
}

function chatGlossary(question) {
  for (const [key, def] of Object.entries(GLOSSARY)) {
    if (question.includes(def.label) || question.toLowerCase().includes(key.toLowerCase())) {
      return {
        content: `**${def.label}**\n\n${def.description}${def.example ? `\n\n💡 *举例：${def.example}*` : ''}`,
        toolCalls: [],
      }
    }
  }
  return { content: '抱歉，我暂时没有找到这个术语的详细解释。您可以尝试问"什么是 RevPAR/ADR/入住率/星级评定"等。', toolCalls: [] }
}

function chatHowTo(question) {
  for (const [key, doc] of Object.entries(HELP_DOCS)) {
    if (question.includes(doc.keyword) || question.toLowerCase().includes(key)) {
      return {
        content: `**${doc.title}**\n\n${doc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}${doc.tip ? `\n\n💡 ${doc.tip}` : ''}`,
        toolCalls: [],
      }
    }
  }
  return { content: '我可以帮您了解：\n- 如何创建普查任务\n- 如何填报数据\n- 如何导出报表\n- 如何添加用户\n\n请告诉我您想了解哪一项？', toolCalls: [] }
}

function chatAction(question) {
  if (/创建.*任务/.test(question)) {
    return {
      content: '好的，我将为您打开"创建普查任务"页面。',
      toolCalls: [{ id: 't1', name: 'navigate_to', arguments: JSON.stringify({ path: '/census/create' }) }],
    }
  }
  if (/创建.*单位|添加.*单位/.test(question)) {
    return {
      content: '好的，我将为您打开"新增住宿单位"页面。',
      toolCalls: [{ id: 't1', name: 'navigate_to', arguments: JSON.stringify({ path: '/accommodation/create' }) }],
    }
  }
  return { content: '请告诉我您想执行什么操作？例如："帮我创建一个普查任务"', toolCalls: [] }
}

function chatNavigate(question) {
  const paths = [
    { keyword: '仪表盘|工作台|首页', path: '/dashboard', name: '工作台' },
    { keyword: '住宿单位|单位列表', path: '/accommodation', name: '住宿单位列表' },
    { keyword: '普查任务|任务列表', path: '/census', name: '普查任务列表' },
    { keyword: '统计|分析|数据', path: '/statistics', name: '数据统计' },
    { keyword: '地图', path: '/statistics/map', name: '地图分布' },
    { keyword: '用户管理|用户', path: '/system/users', name: '用户管理' },
    { keyword: 'AI 设置|ai设置', path: '/system/ai-settings', name: 'AI 设置' },
  ]
  for (const p of paths) {
    if (new RegExp(p.keyword).test(question)) {
      return {
        content: `好的，正在跳转到「${p.name}」页面…`,
        toolCalls: [{ id: 'n1', name: 'navigate_to', arguments: JSON.stringify({ path: p.path }) }],
      }
    }
  }
  return { content: '抱歉，没有找到匹配的页面。', toolCalls: [] }
}

function chatPolicy(question) {
  const policies = {
    '星级': '我国旅游饭店星级评定按《GB/T 14308-2010 旅游饭店星级的划分与评定》执行，分一星至五星五个等级。评定由各省旅游饭店星级评定委员会组织。',
    '民宿': '依据《GB/T 41648-2022 旅游民宿基本要求与等级划分》，民宿是指利用当地民居等相关闲置资源，主人参与接待，为游客提供体验当地自然、文化与生产生活方式的小型住宿设施。',
    '消防': '《住宿场所消防安全管理标准》要求住宿单位必须通过消防验收并取得《消防安全检查合格证》。',
    '卫生': '住宿单位须依据《公共场所卫生管理条例》取得《公共场所卫生许可证》，许可证有效期 4 年。',
    '普查': '住宿业普查依据《国家旅游业统计调查制度》开展，省级文旅厅负责组织实施。',
  }
  for (const [k, v] of Object.entries(policies)) {
    if (question.includes(k)) {
      return { content: `📚 **${k}相关政策**\n\n${v}`, toolCalls: [] }
    }
  }
  return { content: '我了解的政策包括：星级评定、民宿等级划分、消防安全、卫生许可、普查制度等。请具体询问。', toolCalls: [] }
}

// ============ 场景 4：任务规划 ============

/**
 * 任务规划建议
 */
export async function suggestTaskPlan(input) {
  const params = typeof input === 'string' ? (() => { try { return JSON.parse(input) } catch { return { title: input } } })() : input
  const taskTitle = params.title || ''
  const taskDesc = params.description || ''
  const combined = (taskTitle + ' ' + taskDesc).toLowerCase()

  // 1. 推荐字段 - 根据任务类型
  let recommendedFields = ['name', 'creditCode', 'category', 'rooms', 'beds']
  if (/经营|营收|入住|房价/.test(combined)) {
    recommendedFields = [...recommendedFields, 'occupancyRate', 'adr', 'revpar', 'annualRevenue', 'staffCount']
  }
  if (/安全|合规|消防|卫生/.test(combined)) {
    recommendedFields = [...new Set([...recommendedFields, 'licenseStatus', 'fireInspection', 'healthPermit', 'hasEmergencyPlan', 'safetyIncidents'])]
  }
  if (/民宿|客栈/.test(combined)) {
    recommendedFields = [...new Set([...recommendedFields, 'licenseStatus', 'fireInspection', 'healthPermit'])]
  }
  if (/品质|品牌|星级|评价/.test(combined)) {
    recommendedFields = [...new Set([...recommendedFields, 'starRating', 'brandAffiliation', 'onlineRating', 'complaintCount'])]
  }

  // 2. 推荐区域 - 基于数据陈旧度
  const allUnits = await db.accommodations.toArray()
  const now = Date.now()
  const areaStaleness = {}
  for (const u of allUnits) {
    if (!u.cityCode) continue
    if (!areaStaleness[u.cityCode]) areaStaleness[u.cityCode] = { totalAge: 0, count: 0, missingFields: 0 }
    const age = (now - new Date(u.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    areaStaleness[u.cityCode].totalAge += age
    areaStaleness[u.cityCode].count++
    // 缺失字段计数
    if (!u.occupancyRate || !u.adr || !u.fireInspection) areaStaleness[u.cityCode].missingFields++
  }

  const areaStore = useAreaStore()
  await areaStore.fetchAreas()
  const priorityAreas = Object.entries(areaStaleness)
    .map(([code, s]) => ({
      code,
      name: areaStore.getAreaName(code),
      avgAge: Math.round(s.totalAge / s.count),
      missingPct: Math.round(s.missingFields / s.count * 100),
      score: Math.round((s.totalAge / s.count) * 0.6 + (s.missingFields / s.count * 100) * 0.4),
      unitsCount: s.count,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(a => ({
      ...a,
      reason: `${a.unitsCount}家单位，平均${a.avgAge}天未更新，${a.missingPct}%字段缺失`,
    }))

  // 3. 推荐截止日期 - 基于历史任务平均时长
  const historicalTasks = await db.censusTasks.where('status').equals('completed').toArray()
  let avgDays = 60
  if (historicalTasks.length > 0) {
    const durations = historicalTasks.map(t => {
      const start = new Date(t.createdAt).getTime()
      const end = new Date(t.updatedAt).getTime()
      return (end - start) / (1000 * 60 * 60 * 24)
    })
    avgDays = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
  }
  const recommendedDeadline = new Date(now + (avgDays * 1.2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

  // 4. 推荐普查员 - 基于工作量
  const enumerators = await db.users.where('role').equals('enumerator').toArray()
  const assignments = await db.censusAssignments.where('status').anyOf(['pending', 'in_progress']).toArray()
  const workloadMap = {}
  assignments.forEach(a => { workloadMap[a.assignedTo] = (workloadMap[a.assignedTo] || 0) + 1 })
  const recommendedEnumerators = enumerators
    .map(e => ({
      id: e.id,
      name: e.realName,
      areaName: e.areaName,
      currentWorkload: workloadMap[e.id] || 0,
    }))
    .sort((a, b) => a.currentWorkload - b.currentWorkload)
    .slice(0, 5)
    .map(e => ({
      ...e,
      reason: e.currentWorkload === 0 ? '当前无任务，可立即接单' : `当前有 ${e.currentWorkload} 个进行中任务`,
    }))

  // 5. 风险评估
  const risks = []
  for (const area of priorityAreas.slice(0, 3)) {
    const areaEnumerators = enumerators.filter(e => e.areaCode === area.code || e.areaCode.startsWith(area.code.substring(0, 4)))
    if (areaEnumerators.length === 0) {
      risks.push({ area: area.name, probability: 'high', mitigation: '该区域无可用普查员，建议从邻近区域调派' })
    } else if (area.unitsCount / areaEnumerators.length > 30) {
      risks.push({ area: area.name, probability: 'medium', mitigation: `普查员人均需负责 ${Math.ceil(area.unitsCount / areaEnumerators.length)} 家单位，建议增派人员` })
    }
  }

  return {
    content: JSON.stringify({
      priorityAreas,
      recommendedFields,
      recommendedDeadline,
      recommendedEnumerators,
      risks,
      avgHistoricalDays: avgDays,
    }),
    toolCalls: [],
  }
}

/**
 * 任务风险评估
 */
export async function assessTaskRisk(input) {
  const params = typeof input === 'string' ? JSON.parse(input || '{}') : input
  const taskId = params.taskId
  if (!taskId) return { content: JSON.stringify({ risks: [] }), toolCalls: [] }

  const assignments = await db.censusAssignments.where('taskId').equals(Number(taskId)).toArray()
  const task = await db.censusTasks.get(Number(taskId))
  if (!task) return { content: JSON.stringify({ risks: [] }), toolCalls: [] }

  const deadline = new Date(task.deadline).getTime()
  const now = Date.now()
  const daysLeft = Math.round((deadline - now) / (1000 * 60 * 60 * 24))

  const risks = []
  const stuckAssignments = assignments.filter(a => ['pending', 'in_progress'].includes(a.status) && a.progress < 50)

  if (stuckAssignments.length > 0 && daysLeft < 30) {
    risks.push({
      level: 'high',
      message: `${stuckAssignments.length} 个区域进度不足 50%，距截止日期仅 ${daysLeft} 天`,
      action: '建议加派人员或催促执行',
    })
  }

  if (daysLeft < 0) {
    risks.push({ level: 'high', message: '任务已逾期', action: '请尽快关闭或延期' })
  }

  const unassignedCount = assignments.filter(a => !a.assignedTo).length
  if (unassignedCount > 0) {
    risks.push({ level: 'medium', message: `${unassignedCount} 个区域尚未分配普查员`, action: '请尽快分配' })
  }

  return {
    content: JSON.stringify({
      risks,
      summary: risks.length === 0 ? '任务进度正常，无明显风险' : `识别到 ${risks.length} 项潜在风险`,
      daysLeft,
    }),
    toolCalls: [],
  }
}
