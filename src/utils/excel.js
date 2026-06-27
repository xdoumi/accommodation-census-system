import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { CATEGORY_MAP, OPERATING_STATUS_MAP, LICENSE_STATUS_MAP, FIRE_INSPECTION_MAP, HEALTH_PERMIT_MAP } from './constants'
import {
  COLLECTION_FIELD_MAP,
  COLLECTION_MODULES,
  INDUSTRY_OPTIONS,
  createEmptyCollectionForm,
  extractAccommodationPatch,
  shouldSkipBusinessModule,
} from './collectionSpec'
import { buildDivisionCode, inferDivisionFromAddress } from './divisionHelper'
import db from '@/db'

/**
 * 导出数据为 Excel 文件
 * @param {Array<Object>} data - 数据数组
 * @param {Array<Object>} columns - 列定义 [{ key, title, formatter? }]
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportToExcel(data, columns, filename = '导出数据') {
  const headers = columns.map(c => c.title)
  const rows = data.map(row =>
    columns.map(col => {
      let val = row[col.key]
      if (col.formatter) val = col.formatter(val, row)
      return val ?? ''
    })
  )

  const wsData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 设置列宽
  ws['!cols'] = columns.map(c => ({ wch: c.width || 15 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, `${filename}.xlsx`)
}

/**
 * 从 Excel 文件导入数据
 * @param {File} file - 上传的 Excel 文件
 * @param {Object} columnMapping - Excel列名到字段key的映射 { 'Excel列名': 'fieldKey' }
 * @returns {Promise<Array<Object>>} 解析后的数据数组
 */
export function importFromExcel(file, columnMapping) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)

        // 映射列名
        const mapped = jsonData.map(row => {
          const item = {}
          for (const [excelCol, fieldKey] of Object.entries(columnMapping)) {
            if (row[excelCol] !== undefined) {
              item[fieldKey] = row[excelCol]
            }
          }
          return item
        })

        resolve(mapped)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

const OMIT_TEMPLATE_FIELDS = new Set([
  'location',
  'businessLicensePhoto',
  'storefrontPhotos',
  'groupPhotos',
  'managerSignature',
  'managerSignatureAt',
])

const FIELD_EXTRA_INSTRUCTIONS = {
  unitName: '填写住宿单位对外使用名称。',
  otaPlatforms: '可多选，多个选项用顿号、逗号或分号分隔；未接入填写“均未接入任何线上平台”。',
  rooms: '填写非负整数。',
  beds: '填写非负整数。',
  staffCount: '填写非负整数。',
  registeredDivisionCode: '填写12位区划代码。',
  registeredDivisionAddress: '按省、市州、区县、街道填写，例如：贵州省 / 贵阳市 / 云岩区 / 北京路街道。',
  actualDivisionAddress: '按省、市州、区县、街道填写，例如：贵州省 / 贵阳市 / 云岩区 / 北京路街道。',
  divisionCode: '填写12位实际经营区划代码。',
  legalRepresentativePhone: '填写手机号码或固定电话号码，例如：13800138000、0851-12345678。',
  contactPhone: '填写手机号码或固定电话号码，例如：13800138000、0851-12345678。',
}

function templateModules() {
  return COLLECTION_MODULES.filter(module => module.key !== 'PREVIEW')
}

export function getAccommodationImportTemplateColumns() {
  const columns = templateModules().flatMap(module => module.fields
    .filter(key => !OMIT_TEMPLATE_FIELDS.has(key))
    .map(key => {
      const field = COLLECTION_FIELD_MAP[key]
      return {
        key,
        module: module.title,
        englishName: key,
        chineseName: `${module.title} - ${field.label}`,
        instruction: buildFieldInstruction(key, field),
      }
    }))
  const unitNameIndex = columns.findIndex(col => col.key === 'unitName')
  if (unitNameIndex >= 0) {
    columns.splice(unitNameIndex + 1, 0,
      {
        key: 'cityCode',
        module: '定位与背景',
        englishName: 'cityCode',
        chineseName: '定位与背景 - 市州',
        instruction: '选填；填写贵州省市州名称或6位市州代码，例如：贵阳市或520100。',
      },
      {
        key: 'countyCode',
        module: '定位与背景',
        englishName: 'countyCode',
        chineseName: '定位与背景 - 区县',
        instruction: '选填；填写贵州省区县名称或6位区县代码，例如：云岩区或520103。',
      },
    )
  }
  return columns
}

function buildFieldInstruction(key, field) {
  const parts = []
  if (isTemplateRequired(key)) parts.push('必填')
  else parts.push('选填')
  if (FIELD_EXTRA_INSTRUCTIONS[key]) parts.push(FIELD_EXTRA_INSTRUCTIONS[key])
  if (field.options?.length) parts.push(`选项：${field.options.map(opt => opt.label).join('、')}`)
  if (field.type === 'date') parts.push('日期格式：YYYY-MM-DD')
  if (field.type === 'integer') parts.push('填写整数')
  return parts.join('；')
}

function isTemplateRequired(key) {
  return ['unitName', 'catalogSource'].includes(key)
}

export function downloadAccommodationCollectionTemplate(sampleRows = []) {
  const columns = getAccommodationImportTemplateColumns()
  const wsData = [
    columns.map(col => col.englishName),
    columns.map(col => col.chineseName),
    columns.map(col => col.instruction),
    ...sampleRows.map(row => columns.map(col => formatTemplateValue(row[col.key]))),
  ]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = columns.map(col => ({ wch: Math.min(Math.max(col.chineseName.length + 4, 18), 36) }))
  ws['!freeze'] = { xSplit: 0, ySplit: 3 }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '住宿业普查填报模板')
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), '住宿业普查填报导入模板.xlsx')
}

export function parseAccommodationCollectionImport(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
        const areas = await db.areas.toArray()
        resolve(parseTemplateRows(rows, areas))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function parseTemplateRows(rows, areas = []) {
  if (rows.length < 3) return []
  const columns = getAccommodationImportTemplateColumns()
  const fieldByEnglish = new Map(columns.map(col => [normalizeHeader(col.englishName), col.key]))
  const fieldByChinese = new Map(columns.map(col => [normalizeHeader(col.chineseName), col.key]))
  const englishRow = rows[0] || []
  const chineseRow = rows[1] || []
  const fieldKeys = englishRow.map((value, index) => {
    return fieldByEnglish.get(normalizeHeader(value)) || fieldByChinese.get(normalizeHeader(chineseRow[index])) || null
  })
  return rows.slice(3)
    .filter(row => row.some(value => String(value ?? '').trim() !== ''))
    .map(row => {
      const form = createEmptyCollectionForm()
      fieldKeys.forEach((key, index) => {
        if (!key) return
        const raw = row[index]
        if (raw === undefined || raw === null || String(raw).trim() === '') return
        if (key === 'cityCode') form.divisionCityCode = normalizeAreaCode(raw, areas, 2)
        else if (key === 'countyCode') form.divisionCountyCode = normalizeAreaCode(raw, areas, 3)
        else if (key === 'registeredDivisionAddress') applyDivisionAddress(form, 'registeredDivision', 'registeredDivisionCode', raw, areas)
        else if (key === 'actualDivisionAddress') applyDivisionAddress(form, 'division', 'divisionCode', raw, areas)
        else form[key] = parseFieldValue(key, raw)
      })
      validateRequiredImportFields(form)
      if (!form.divisionCode && form.divisionCountyCode) form.divisionCode = `${form.divisionCountyCode}000000`
      if (!form.registeredDivisionCode && form.registeredDivisionCountyCode) form.registeredDivisionCode = `${form.registeredDivisionCountyCode}000000`
      if (shouldSkipBusinessModule(form)) clearBusinessFields(form)
      const patch = extractAccommodationPatch(form)
      return {
        ...patch,
        importFormData: form,
      }
    })
}

function applyDivisionAddress(form, prefix, codeKey, raw, areas) {
  const text = String(raw || '').trim()
  form[prefix === 'division' ? 'actualDivisionAddress' : 'registeredDivisionAddress'] = text
  const inferred = inferDivisionFromAddress(text, areas)
  form[`${prefix}ProvinceCode`] = inferred.provinceCode
  form[`${prefix}CityCode`] = inferred.cityCode
  form[`${prefix}CountyCode`] = inferred.countyCode
  form[`${prefix}StreetCode`] = inferred.streetCode || '999'
  form[`${prefix}StreetName`] = inferred.streetName || ''
  form[codeKey] = buildDivisionCode(inferred.countyCode, form[`${prefix}StreetCode`])
}

function validateRequiredImportFields(form) {
  if (!String(form.unitName || '').trim()) throw new Error('模板必填项缺失：定位与背景 - 单位名称')
  if (!String(form.catalogSource || '').trim()) throw new Error('模板必填项缺失：定位与背景 - 来源')
}

function normalizeAreaCode(raw, areas, level) {
  const text = String(raw || '').trim()
  if (!text) return ''
  if (/^\d{6}$/.test(text)) return text
  const area = areas.find(item => item.level === level && (item.name === text || text.includes(item.name) || item.name.includes(text)))
  return area?.code || text
}

function normalizeHeader(value) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function parseFieldValue(key, raw) {
  const field = COLLECTION_FIELD_MAP[key]
  const text = String(raw).trim()
  if (!field) return text
  if (field.type === 'integer') return Number(raw) || 0
  if (field.type === 'checkbox') return parseMultiOptionValue(field, text)
  if (['select', 'radio', 'industry'].includes(field.type)) return parseOptionValue(field, text)
  return raw
}

function parseOptionValue(field, text) {
  if (!text) return ''
  if (field.type === 'industry') {
    const industry = INDUSTRY_OPTIONS.find(opt => opt.value === text || opt.label === text)
    return industry?.value || text
  }
  const option = field.options?.find(opt => opt.value === text || opt.label === text)
  return option?.value || text
}

function parseMultiOptionValue(field, text) {
  if (!text) return []
  const values = text.split(/[、,，;；]/).map(item => item.trim()).filter(Boolean)
  return values.map(value => parseOptionValue(field, value))
}

function clearBusinessFields(form) {
  const module = COLLECTION_MODULES.find(item => item.key === 'B')
  module?.fields.forEach(key => {
    if (key !== 'businessLicensePhoto') form[key] = createEmptyCollectionForm()[key]
  })
}

function formatTemplateValue(value) {
  if (Array.isArray(value)) return value.join('、')
  return value ?? ''
}

/**
 * 住宿单位导出列定义
 */
export const ACCOMMODATION_EXPORT_COLUMNS = [
  { key: 'name', title: '单位名称', width: 20 },
  { key: 'creditCode', title: '统一社会信用代码', width: 22 },
  { key: 'category', title: '类别', width: 12, formatter: (v) => CATEGORY_MAP[v] || v },
  { key: 'provinceCode', title: '省', width: 10 },
  { key: 'cityCode', title: '市', width: 10 },
  { key: 'countyCode', title: '区县', width: 10 },
  { key: 'detailAddress', title: '详细地址', width: 25 },
  { key: 'businessType', title: '经营主体类型', width: 14 },
  { key: 'licenseStatus', title: '证照状态', width: 10, formatter: (v) => LICENSE_STATUS_MAP[v] || v },
  { key: 'openDate', title: '开业日期', width: 12 },
  { key: 'operatingStatus', title: '经营状态', width: 10, formatter: (v) => OPERATING_STATUS_MAP[v] || v },
  { key: 'rooms', title: '客房数', width: 8 },
  { key: 'beds', title: '床位数', width: 8 },
  { key: 'floorArea', title: '建筑面积(㎡)', width: 12 },
  { key: 'hasDining', title: '餐饮', width: 6, formatter: (v) => v ? '是' : '否' },
  { key: 'hasParking', title: '停车', width: 6, formatter: (v) => v ? '是' : '否' },
  { key: 'annualRevenue', title: '年营收(元)', width: 12 },
  { key: 'staffCount', title: '从业人数', width: 10 },
  { key: 'starRating', title: '星级', width: 8 },
  { key: 'brandAffiliation', title: '品牌', width: 12 },
  { key: 'onlineRating', title: '在线评分', width: 10 },
  { key: 'fireInspection', title: '消防验收', width: 10, formatter: (v) => FIRE_INSPECTION_MAP[v] || v },
  { key: 'healthPermit', title: '卫生许可', width: 10, formatter: (v) => HEALTH_PERMIT_MAP[v] || v },
  { key: 'safetyIncidents', title: '安全事故数', width: 10 },
  { key: 'hasEmergencyPlan', title: '应急预案', width: 8, formatter: (v) => v ? '是' : '否' },
]

/**
 * 下载导入模板
 */
export function downloadImportTemplate() {
  downloadAccommodationCollectionTemplate()
}
