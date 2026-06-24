export const GUIZHOU_PROVINCE_CODE = '520000'
export const GUIZHOU_PROVINCE_NAME = '贵州省'

const DEFAULT_STREETS = [
  { code: '001', name: '中华路街道' },
  { code: '002', name: '北京路街道' },
  { code: '003', name: '新华路街道' },
  { code: '004', name: '沙冲路街道' },
  { code: '005', name: '文昌阁街道' },
  { code: '006', name: '延安路街道' },
  { code: '007', name: '市府路街道' },
  { code: '008', name: '中山路街道' },
  { code: '009', name: '人民路街道' },
  { code: '010', name: '黄果树镇' },
  { code: '011', name: '万峰林街道' },
  { code: '012', name: '碧江街道' },
  { code: '013', name: '凯棠镇' },
  { code: '014', name: '都匀经济开发区' },
  { code: '999', name: '其他街道/乡镇' },
]

const COUNTY_STREET_MAP = {
  520102: [
    { code: '001', name: '新华路街道' },
    { code: '002', name: '中华南路街道' },
    { code: '003', name: '沙冲路街道' },
    { code: '004', name: '花果园街道' },
  ],
  520103: [
    { code: '001', name: '北京路街道' },
    { code: '002', name: '中华北路街道' },
    { code: '003', name: '文昌阁街道' },
    { code: '004', name: '黔灵东路街道' },
  ],
  520111: [
    { code: '001', name: '贵筑街道' },
    { code: '002', name: '清溪街道' },
    { code: '003', name: '溪北街道' },
  ],
  520115: [
    { code: '001', name: '金阳街道' },
    { code: '002', name: '观山街道' },
    { code: '003', name: '世纪城街道' },
  ],
  520302: [
    { code: '001', name: '中华路街道' },
    { code: '002', name: '万里路街道' },
    { code: '003', name: '忠庄街道' },
  ],
  520402: [
    { code: '001', name: '南街街道' },
    { code: '002', name: '西街街道' },
    { code: '003', name: '东关街道' },
  ],
  522601: [
    { code: '001', name: '城西街道' },
    { code: '002', name: '大十字街道' },
    { code: '003', name: '湾溪街道' },
  ],
}

export function getStreetOptions(countyCode) {
  const options = COUNTY_STREET_MAP[countyCode] || DEFAULT_STREETS
  const map = new Map()
  ;[...options, ...DEFAULT_STREETS].forEach(item => map.set(item.code, item))
  return Array.from(map.values())
}

export function buildDivisionCode(countyCode, streetCode = '000') {
  if (!/^\d{6}$/.test(String(countyCode || ''))) return ''
  const normalizedStreetCode = /^\d{3}$/.test(String(streetCode || '')) ? String(streetCode) : '999'
  return `${countyCode}${normalizedStreetCode}000`
}

export function splitDivisionCode(code) {
  const text = String(code || '')
  if (!/^\d{12}$/.test(text)) return { countyCode: '', streetCode: '' }
  return { countyCode: text.slice(0, 6), streetCode: text.slice(6, 9) }
}

export function inferDivisionFromAddress(address = '', areas = []) {
  const text = String(address || '')
  const result = {
    provinceCode: GUIZHOU_PROVINCE_CODE,
    cityCode: '',
    countyCode: '',
    streetCode: '',
    streetName: '',
  }
  if (!text) return result

  const counties = areas.filter(item => item.level === 3)
  const county = counties.find(item => text.includes(item.name))
  if (county) {
    result.countyCode = county.code
    result.cityCode = county.parentCode || ''
  } else {
    const cities = areas.filter(item => item.level === 2)
    const city = cities.find(item => text.includes(item.name.replace('市', '')) || text.includes(item.name))
    if (city) result.cityCode = city.code
  }

  const street = getStreetOptions(result.countyCode).find(item => text.includes(item.name.replace(/街道|镇|乡$/, '')) || text.includes(item.name))
  if (street) {
    result.streetCode = street.code
    result.streetName = street.name
  }
  return result
}
