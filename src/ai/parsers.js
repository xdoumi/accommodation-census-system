/**
 * 语音/自然语言 → 结构化表单字段解析器
 * 使用正则和规则引擎，无需真实 AI 即可解析中文描述
 */
import { CATEGORY_MAP } from '@/utils/constants'

const STAR_MAP = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5 }
const CATEGORY_KEYWORDS = {
  'star_hotel': ['星级酒店', '星级饭店', '旅游饭店'],
  'non_star_hotel': ['经济型酒店', '商务酒店', '快捷酒店', '连锁酒店'],
  'minshuku': ['民宿', '家庭旅馆', '农家乐'],
  'kezhan': ['客栈', '青年旅舍', '旅社'],
  'other': ['旅馆', '招待所', '小旅馆'],
}

const STATUS_MAP = {
  '正常营业': 'operating', '营业中': 'operating', '营业': 'operating',
  '停业': 'closed', '已停业': 'closed',
  '装修': 'renovating', '装修中': 'renovating',
  '暂停': 'suspended', '暂停营业': 'suspended',
}

/**
 * 解析语音/自然语言文本为结构化字段
 */
export function parseVoiceText(text) {
  if (!text) return {}
  const fields = {}

  // 1. 星级
  for (const [cn, num] of Object.entries(STAR_MAP)) {
    if (text.includes(cn + '星')) {
      fields.starRating = num
      fields.category = 'star_hotel'
      break
    }
    if (text.includes(num + '星')) {
      fields.starRating = num
      fields.category = 'star_hotel'
      break
    }
  }

  // 2. 类别
  if (!fields.category) {
    for (const [code, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => text.includes(kw))) {
        fields.category = code
        break
      }
    }
  }

  // 3. 客房数
  const roomMatch = text.match(/(\d+)\s*[间套]?房/)
  if (roomMatch) fields.rooms = parseInt(roomMatch[1])

  // 4. 床位数
  const bedMatch = text.match(/(\d+)\s*张?床/)
  if (bedMatch) fields.beds = parseInt(bedMatch[1])

  // 5. 平均房价
  const adrMatch = text.match(/平均房价[^\d]*(\d+)/) || text.match(/均价[^\d]*(\d+)/) || text.match(/房价[^\d]*(\d+)/)
  if (adrMatch) fields.adr = parseInt(adrMatch[1])

  // 6. 入住率
  const occMatch = text.match(/入住率[^\d]*(\d+(?:\.\d+)?)/)
  if (occMatch) fields.occupancyRate = parseFloat(occMatch[1])

  // 7. 从业人数
  const staffMatch = text.match(/(\d+)\s*[名个]?员?工/) || text.match(/从业[^\d]*(\d+)/)
  if (staffMatch) fields.staffCount = parseInt(staffMatch[1])

  // 8. 面积
  const areaMatch = text.match(/(\d+)\s*平/) || text.match(/面积[^\d]*(\d+)/)
  if (areaMatch) fields.floorArea = parseInt(areaMatch[1])

  // 9. 经营状态
  for (const [kw, code] of Object.entries(STATUS_MAP)) {
    if (text.includes(kw)) {
      fields.operatingStatus = code
      break
    }
  }

  // 10. 配套设施
  if (text.includes('餐饮') || text.includes('餐厅') || text.includes('吃饭')) fields.hasDining = true
  if (text.includes('停车')) fields.hasParking = true
  if (text.includes('游泳') || text.includes('泳池')) fields.hasPool = true
  if (text.includes('健身') || text.includes('健身房')) fields.hasGym = true
  if (text.includes('会议')) fields.hasConference = true
  if (text.includes('无障碍')) fields.hasAccessibility = true

  // 11. 年营收
  const revMatch = text.match(/年营收[^\d]*(\d+)/) || text.match(/年收入[^\d]*(\d+)/) || text.match(/营收[^\d]*(\d+)/)
  if (revMatch) fields.annualRevenue = parseInt(revMatch[1])

  // 12. 品牌名
  for (const brand of ['如家', '汉庭', '7天', '全季', '亚朵', '希尔顿', '万豪', '洲际']) {
    if (text.includes(brand)) { fields.brandAffiliation = brand; break }
  }

  // 13. 地址
  const addrMatch = text.match(/位于(.+?)(?:，|,|。|$)/) || text.match(/地址[是为：:](.+?)(?:，|,|。|$)/)
  if (addrMatch) fields.detailAddress = addrMatch[1].trim()

  return fields
}
