/**
 * 住宿单位数据 - 本地异常检测规则引擎
 *
 * 输入：表单数据对象
 * 输出：异常列表 [{ field, severity, message, suggestion, suggestedValue }]
 *
 * 规则按行业常识 + 数学一致性设计，先于 AI 跑，避免给模型加噪声。
 */

/**
 * @typedef {Object} Anomaly
 * @property {string} field - 涉及的字段（用于 UI 高亮）
 * @property {'error'|'warning'} severity
 * @property {string} message
 * @property {string} [suggestion]
 * @property {any} [suggestedValue]
 */

const RULES = [
  // 床位/客房数比例
  (f) => {
    if (!f.rooms || !f.beds) return null
    const ratio = f.beds / f.rooms
    if (ratio < 1) {
      return {
        field: 'beds', severity: 'warning',
        message: `床位数(${f.beds})少于客房数(${f.rooms})`,
        suggestion: '通常每间客房至少 1 张床位，请确认',
        suggestedValue: Math.max(f.rooms, f.beds),
      }
    }
    if (ratio > 4) {
      return {
        field: 'beds', severity: 'warning',
        message: `床位/客房比 ${ratio.toFixed(1)} 偏高`,
        suggestion: '常见酒店 1.3-2.5，胶囊/通铺除外，请确认',
      }
    }
    return null
  },

  // 入住率范围
  (f) => {
    if (f.occupancyRate == null) return null
    if (f.occupancyRate < 0 || f.occupancyRate > 100) {
      return {
        field: 'occupancyRate', severity: 'error',
        message: `入住率必须在 0-100% 之间，当前 ${f.occupancyRate}%`,
        suggestion: '请核对小数点位置',
        suggestedValue: Math.min(100, Math.max(0, f.occupancyRate)),
      }
    }
    if (f.operatingStatus === 'operating' && f.occupancyRate === 0) {
      return {
        field: 'occupancyRate', severity: 'warning',
        message: '正常营业状态下入住率为 0%',
        suggestion: '是否漏填？',
      }
    }
    return null
  },

  // RevPAR = ADR × 入住率/100
  (f) => {
    if (!f.adr || f.occupancyRate == null || f.revpar == null) return null
    const expected = Math.round(f.adr * f.occupancyRate / 100)
    const diff = Math.abs(f.revpar - expected)
    if (expected > 0 && diff / expected > 0.20) {
      return {
        field: 'revpar', severity: 'warning',
        message: `RevPAR(${f.revpar}) 与 ADR×入住率(${expected}) 差异 ${Math.round(diff / expected * 100)}%`,
        suggestion: `RevPAR ≈ ADR × 入住率，建议值约 ¥${expected}`,
        suggestedValue: expected,
      }
    }
    return null
  },

  // 房价合理性 - 按类别区间
  (f) => {
    if (!f.adr || f.adr <= 0) return null
    const ranges = {
      star_hotel: [200, 3000],
      non_star_hotel: [80, 600],
      minshuku: [80, 1500],
      kezhan: [50, 500],
      other: [40, 400],
    }
    const range = ranges[f.category]
    if (!range) return null
    if (f.adr < range[0]) {
      return {
        field: 'adr', severity: 'warning',
        message: `房价(¥${f.adr}) 低于该类别常见区间 (¥${range[0]}-${range[1]})`,
        suggestion: '请确认是否含税或单位是否正确',
      }
    }
    if (f.adr > range[1]) {
      return {
        field: 'adr', severity: 'warning',
        message: `房价(¥${f.adr}) 高于该类别常见区间 (¥${range[0]}-${range[1]})`,
        suggestion: '若为高端度假/套房，可忽略此提示',
      }
    }
    return null
  },

  // 星级酒店必填星级
  (f) => {
    if (f.category === 'star_hotel' && !f.starRating) {
      return {
        field: 'starRating', severity: 'warning',
        message: '星级酒店未填写星级',
        suggestion: '请选择 1-5 星',
      }
    }
    if (f.category && f.category !== 'star_hotel' && f.starRating) {
      return {
        field: 'starRating', severity: 'warning',
        message: '非星级酒店类别填写了星级',
        suggestion: '建议清空星级或修正类别',
        suggestedValue: null,
      }
    }
    return null
  },

  // 从业人数与规模
  (f) => {
    if (!f.rooms || !f.staffCount) return null
    const perRoom = f.staffCount / f.rooms
    if (perRoom < 0.1) {
      return {
        field: 'staffCount', severity: 'warning',
        message: `从业人数(${f.staffCount}) 相对于 ${f.rooms} 间客房偏少`,
        suggestion: '常见配比 0.3-1.5 人/间，请确认',
      }
    }
    if (perRoom > 3) {
      return {
        field: 'staffCount', severity: 'warning',
        message: `从业人数(${f.staffCount}) 相对于 ${f.rooms} 间客房偏多`,
        suggestion: '请确认是否含其他业务线员工',
      }
    }
    return null
  },

  // 年营业收入 vs 理论值
  (f) => {
    if (!f.rooms || !f.adr || f.occupancyRate == null || !f.annualRevenue) return null
    const theoretical = Math.round(f.rooms * 365 * (f.occupancyRate / 100) * f.adr)
    if (theoretical <= 0) return null
    const diff = Math.abs(f.annualRevenue - theoretical) / theoretical
    if (diff > 0.5) {
      return {
        field: 'annualRevenue', severity: 'warning',
        message: `年营收 ¥${f.annualRevenue.toLocaleString()} 与理论估算 ¥${theoretical.toLocaleString()} 差异 ${Math.round(diff * 100)}%`,
        suggestion: `理论 = 客房×365×入住率×ADR ≈ ¥${theoretical.toLocaleString()}`,
        suggestedValue: theoretical,
      }
    }
    return null
  },

  // 信用代码格式
  (f) => {
    if (!f.creditCode) return null
    if (!/^[0-9A-Z]{18}$/.test(f.creditCode)) {
      return {
        field: 'creditCode', severity: 'error',
        message: '统一社会信用代码格式不正确',
        suggestion: '应为 18 位数字+大写字母组合',
      }
    }
    return null
  },

  // 合规：营业但未办证
  (f) => {
    if (f.operatingStatus === 'operating' && f.licenseStatus === 'none') {
      return {
        field: 'licenseStatus', severity: 'error',
        message: '正常营业但证照状态为"未办证"',
        suggestion: '请核实证照办理情况',
      }
    }
    return null
  },

  // 建筑面积合理性
  (f) => {
    if (!f.rooms || !f.floorArea) return null
    const perRoom = f.floorArea / f.rooms
    if (perRoom < 8) {
      return {
        field: 'floorArea', severity: 'warning',
        message: `平均每间客房建筑面积仅 ${perRoom.toFixed(1)} ㎡`,
        suggestion: '常见 15-50 ㎡/间，请确认',
      }
    }
    if (perRoom > 150) {
      return {
        field: 'floorArea', severity: 'warning',
        message: `平均每间客房建筑面积达 ${perRoom.toFixed(0)} ㎡`,
        suggestion: '请确认是否含公共区域/配套设施',
      }
    }
    return null
  },
]

/**
 * 跑本地规则
 * @param {Object} formData
 * @returns {Anomaly[]}
 */
export function detectLocalAnomalies(formData) {
  const issues = []
  for (const rule of RULES) {
    try {
      const r = rule(formData)
      if (r) issues.push(r)
    } catch (e) {
      console.warn('[anomaly] rule error', e)
    }
  }
  return issues
}

/** 合并去重：同一字段保留最严重的一条 */
export function mergeAnomalies(...lists) {
  const map = {}
  for (const list of lists) {
    for (const issue of list || []) {
      const key = issue.field || issue.message
      const existing = map[key]
      if (!existing) {
        map[key] = issue
      } else {
        // error > warning
        const sevRank = { error: 2, warning: 1 }
        if ((sevRank[issue.severity] || 0) > (sevRank[existing.severity] || 0)) {
          map[key] = issue
        }
      }
    }
  }
  return Object.values(map)
}
