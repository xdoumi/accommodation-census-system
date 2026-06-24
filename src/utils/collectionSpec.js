export const COLLECTION_MODULES = [
  {
    key: 'A',
    title: '定位与背景',
    shortTitle: '定位与背景',
    fields: ['location', 'unitName', 'checkType', 'catalogSource', 'licenseType'],
  },
  {
    key: 'B',
    title: '工商信息',
    shortTitle: '工商信息',
    fields: [
      'businessLicensePhoto',
      'registeredName',
      'creditCode',
      'registrationAuthority',
      'registrationAuthorityOther',
      'registrationDate',
      'registeredStatus',
      'registeredAddress',
      'registeredDivisionAddress',
      'registeredDivisionCode',
      'legalRepresentative',
      'legalRepresentativePhone',
    ],
  },
  {
    key: 'C',
    title: '实际经营情况',
    shortTitle: '实际经营情况',
    fields: [
      'operatingName',
      'actualOperatingStatus',
      'actualAddress',
      'actualDivisionAddress',
      'divisionCode',
      'contactName',
      'contactPhone',
      'economyIndustryCode',
      'isStarIndustryCode',
      'ratingLevel',
      'stateHolding',
    ],
  },
  {
    key: 'D',
    title: '经营信息',
    shortTitle: '经营信息',
    fields: [
      'buildingOwnership',
      'businessMode',
      'businessModeRemark',
      'rooms',
      'beds',
      'staffCount',
      'subjectType',
    ],
  },
  {
    key: 'E',
    title: '治安与管理系统',
    shortTitle: '治安与管理系统',
    fields: ['policeSystemStatus', 'policeSystemReason', 'inOriginalCultureTourismList'],
  },
  {
    key: 'F',
    title: '线上平台',
    shortTitle: '线上平台',
    fields: ['otaPlatforms', 'otaOther'],
  },
  {
    key: 'G',
    title: '现场留痕',
    shortTitle: '现场留痕',
    fields: ['storefrontPhotos', 'groupPhotos'],
  },
  {
    key: 'SIGN',
    title: '签字确认',
    shortTitle: '签字确认',
    fields: ['managerSignature', 'managerSignatureAt'],
  },
  {
    key: 'PREVIEW',
    title: '提交预览',
    shortTitle: '提交预览',
    fields: [],
  },
]

export const COLLECTION_STEP_LABELS = COLLECTION_MODULES.map(m => m.shortTitle)

export const COLLECTION_FIELD_MAP = {
  location: { code: 'A1', label: '定位坐标', required: true, type: 'location' },
  unitName: { code: 'A2', label: '单位名称', required: true, type: 'text', maxLength: 100 },
  checkType: {
    code: 'A3',
    label: '核查类型',
    required: true,
    type: 'select',
    options: [
      { value: 'catalog_spot_check', label: '确定名录抽查' },
      { value: 'imported_catalog', label: '导入名录核查' },
      { value: 'new_catalog', label: '新增名单' },
    ],
  },
  catalogSource: {
    code: 'A3-a',
    label: '来源',
    requiredWhen: data => ['catalog_spot_check', 'imported_catalog'].includes(data.checkType),
    visibleWhen: data => ['catalog_spot_check', 'imported_catalog'].includes(data.checkType),
    type: 'select',
    options: [
      { value: 'market_supervision', label: '市监' },
      { value: 'culture_tourism', label: '文旅厅' },
      { value: 'public_security_hotel', label: '公安旅馆治安系统' },
      { value: 'other', label: '其他' },
    ],
  },
  licenseType: {
    code: 'A4',
    label: '执照类型',
    required: true,
    type: 'select',
    options: [
      { value: 'has_license', label: '有营业执照或同等效力执照' },
      { value: 'no_license', label: '无营业执照或同等效力执照' },
      { value: 'other', label: '其他' },
    ],
  },
  businessLicensePhoto: { code: 'B1', label: '营业执照或同等效力照片', required: true, type: 'photo' },
  registeredName: { code: 'B2', label: '注册单位名称', required: true, type: 'text', maxLength: 100 },
  creditCode: { code: 'B3', label: '统一社会信用代码 / 组织机构代码', required: true, type: 'text' },
  registrationAuthority: {
    code: 'B4',
    label: '注册 / 批准机关名称',
    required: true,
    type: 'select',
    options: [
      { value: 'market', label: '市场监管部门' },
      { value: 'staffing', label: '编制部门' },
      { value: 'civil_affairs', label: '民政部门' },
      { value: 'other', label: '其他' },
    ],
  },
  registrationAuthorityOther: { code: 'B4-1', label: '其他批准机关名称', requiredWhen: data => data.registrationAuthority === 'other', type: 'text' },
  registrationDate: { code: 'B5', label: '工商登记时间', required: true, type: 'date' },
  registeredStatus: {
    code: 'B6',
    label: '当前经营状态',
    required: true,
    type: 'select',
    options: [
      { value: 'operating', label: '营业' },
      { value: 'suspended', label: '停业（歇业）' },
      { value: 'preparing', label: '筹建' },
      { value: 'closed_this_year', label: '当年关闭' },
      { value: 'bankrupt_this_year', label: '当年破产' },
      { value: 'other', label: '其他' },
    ],
  },
  registeredAddress: { code: 'B7', label: '注册地址', required: true, type: 'textarea', maxLength: 200 },
  registeredDivisionAddress: { code: 'B8', label: '区划地址', required: true, type: 'divisionAddress' },
  registeredDivisionCode: { code: 'B9', label: '区划代码（12位）', required: true, type: 'text', pattern: /^\d{12}$/ },
  legalRepresentative: { code: 'B10', label: '法定代表人姓名', required: false, type: 'text', maxLength: 50 },
  legalRepresentativePhone: { code: 'B11', label: '法定代表人手机号', required: true, type: 'tel', pattern: /^1\d{10}$/ },
  operatingName: { code: 'C1', label: '经营单位名称', required: true, type: 'text', maxLength: 100 },
  actualOperatingStatus: {
    code: 'C2',
    label: '当前经营状态',
    required: true,
    type: 'select',
    options: [
      { value: 'operating', label: '营业' },
      { value: 'suspended', label: '停业（歇业）' },
      { value: 'preparing', label: '筹建' },
      { value: 'closed_this_year', label: '当年关闭' },
      { value: 'bankrupt_this_year', label: '当年破产' },
      { value: 'other', label: '其他' },
    ],
  },
  actualAddress: { code: 'C3', label: '实际经营地址', required: true, type: 'textarea', maxLength: 200 },
  actualDivisionAddress: { code: 'C4', label: '实际经营区划地址', required: true, type: 'divisionAddress' },
  divisionCode: { code: 'C5', label: '实际经营区划代码（12位）', required: true, type: 'text', pattern: /^\d{12}$/ },
  contactName: { code: 'C6', label: '联系人姓名', required: false, type: 'text' },
  contactPhone: { code: 'C7', label: '联系人手机号', required: false, type: 'tel', pattern: /^1\d{10}$/ },
  economyIndustryCode: { code: 'C8', label: '行业代码', required: true, type: 'industry' },
  isStarIndustryCode: {
    code: 'C9',
    label: '是否为标"*"行业代码',
    required: true,
    type: 'radio',
    options: [
      { value: 'yes', label: '是' },
      { value: 'no', label: '否' },
    ],
  },
  ratingLevel: {
    code: 'C10',
    label: '等级评定',
    required: true,
    type: 'select',
    options: [
      { value: 'five_star', label: '五星级' },
      { value: 'four_star', label: '四星级' },
      { value: 'three_star', label: '三星级' },
      { value: 'two_or_below', label: '二星级及以下' },
      { value: 'unrated', label: '未评定' },
      { value: 'other', label: '其他' },
    ],
  },
  stateHolding: {
    code: 'C11',
    label: '国有经济控股情况',
    required: true,
    type: 'radio',
    options: [
      { value: 'absolute', label: '绝对控股' },
      { value: 'relative', label: '相对控股' },
      { value: 'other', label: '其他（含非国有）' },
    ],
  },
  policeSystemStatus: {
    code: 'E1',
    label: '是否接入公安旅馆治安系统',
    required: true,
    type: 'select',
    options: [
      { value: 'already_connected', label: '原来已接入' },
      { value: 'newly_added', label: '现场已新增录入公安系统' },
      { value: 'not_connected', label: '还未接入公安系统' },
    ],
  },
  policeSystemReason: {
    code: 'E1-a',
    label: '之前未接入公安系统的具体原因',
    requiredWhen: data => ['newly_added', 'not_connected'].includes(data.policeSystemStatus),
    type: 'textarea',
    maxLength: 200,
  },
  inOriginalCultureTourismList: {
    code: 'E2',
    label: '是否为原文旅系统管理名录',
    required: true,
    type: 'radio',
    options: [
      { value: 'yes', label: '是' },
      { value: 'no', label: '否' },
    ],
  },
  buildingOwnership: {
    code: 'D1',
    label: '建筑物权属',
    required: true,
    type: 'radio',
    options: [
      { value: 'owned', label: '自有' },
      { value: 'leased', label: '租赁' },
    ],
  },
  businessMode: {
    code: 'D2',
    label: '经营形式',
    required: true,
    type: 'select',
    options: [
      { value: 'stable', label: '常年稳定经营' },
      { value: 'seasonal', label: '季节性/阶段性经营' },
      { value: 'reservation', label: '间歇/预约制经营' },
      { value: 'mixed', label: '混合型经营（常年稳定+旺季扩容）' },
      { value: 'other', label: '其他' },
    ],
  },
  businessModeRemark: {
    code: 'D2-a',
    label: '经营形式备注',
    requiredWhen: data => ['seasonal', 'reservation', 'mixed', 'other'].includes(data.businessMode),
    type: 'textarea',
  },
  rooms: { code: 'D3', label: '客房数', required: true, type: 'integer', min: 0, max: 9999 },
  beds: { code: 'D4', label: '床位数', required: true, type: 'integer', min: 0, max: 99999 },
  staffCount: { code: 'D5', label: '从业人员数', required: true, type: 'integer', min: 0, max: 99999 },
  subjectType: {
    code: 'D6',
    label: '调查对象类型',
    required: true,
    type: 'select',
    options: [
      { value: 'above_scale_enterprise', label: '规模以上企业' },
      { value: 'below_scale_enterprise', label: '规模以下企业' },
      { value: 'individual_business', label: '个体户' },
      { value: 'public_institution', label: '行政事业单位' },
      { value: 'non_profit', label: '民间非营利组织' },
    ],
  },
  otaPlatforms: {
    code: 'F1',
    label: '在哪些 OTA 平台上线',
    required: true,
    type: 'checkbox',
    options: [
      { value: 'ctrip', label: '携程' },
      { value: 'meituan', label: '美团' },
      { value: 'fliggy', label: '飞猪' },
      { value: 'ly', label: '同程旅行' },
      { value: 'qunar', label: '去哪儿' },
      { value: 'amap', label: '高德' },
      { value: 'other', label: '其他平台' },
      { value: 'none', label: '均未接入任何线上平台' },
    ],
  },
  otaOther: { code: 'F1-a', label: '其他平台名称', requiredWhen: data => data.otaPlatforms?.includes('other'), type: 'text' },
  storefrontPhotos: { code: 'G1', label: '住宿单位门头照', required: true, type: 'photos' },
  groupPhotos: { code: 'G2', label: '核查人员与门头合影', required: true, type: 'photos' },
  managerSignature: { code: 'H1', label: '住宿单位负责人签字', required: true, type: 'signature' },
  managerSignatureAt: {
    code: 'H2',
    label: '签字时间',
    type: 'text',
    visibleWhen: data => Boolean(data.managerSignature || data.managerSignatureAt),
  },
}

export const COLLECTION_FIELD_LIST = Object.entries(COLLECTION_FIELD_MAP).map(([key, spec]) => ({ key, ...spec }))

export const INDUSTRY_OPTIONS = [
  { value: '6110', label: '6110 旅游饭店', star: true },
  { value: '6121', label: '6121 经济型连锁酒店', star: true },
  { value: '6129', label: '6129 其他一般旅馆', star: false },
  { value: '6130', label: '6130 民宿服务', star: false },
  { value: '6140', label: '6140 露营地服务', star: false },
  { value: '6190', label: '6190 其他住宿业', star: false },
]

export function getCollectionField(key) {
  return COLLECTION_FIELD_MAP[key]
}

export function getOptionLabel(fieldKey, value) {
  const field = COLLECTION_FIELD_MAP[fieldKey]
  if (!field) return value ?? ''
  if (field.type === 'checkbox') {
    const values = Array.isArray(value) ? value : []
    return values.map(v => field.options?.find(o => o.value === v)?.label || v).join('、')
  }
  return field.options?.find(o => o.value === value)?.label || value || ''
}

export function isFieldRequired(fieldKey, form = {}) {
  const field = COLLECTION_FIELD_MAP[fieldKey]
  if (!field) return false
  if (!isFieldVisible(fieldKey, form)) return false
  if (field.requiredWhen) return Boolean(field.requiredWhen(form))
  return Boolean(field.required)
}

export function isFieldVisible(fieldKey, form = {}) {
  const field = COLLECTION_FIELD_MAP[fieldKey]
  if (!field) return false
  if (field.visibleWhen) return Boolean(field.visibleWhen(form))
  return true
}

export function shouldSkipBusinessModule(form = {}) {
  return ['no_license', 'other'].includes(form.licenseType)
}

export function getVisibleModuleFields(module, form = {}) {
  return module.fields.filter(key => isFieldVisible(key, form))
}

export function createEmptyCollectionForm() {
  return {
    location: null,
    locationAddress: '',
    locationAccuracy: null,
    locationCapturedAt: '',
    unitName: '',
    checkType: '',
    catalogSource: '',
    licenseType: '',
    businessLicensePhoto: '',
    businessLicensePhotoName: '',
    registeredName: '',
    creditCode: '',
    registrationAuthority: '',
    registrationAuthorityOther: '',
    registrationDate: '',
    registeredStatus: '',
    registeredAddress: '',
    registeredDivisionAddress: '',
    registeredDivisionCode: '',
    registeredDivisionProvinceCode: '520000',
    registeredDivisionCityCode: '',
    registeredDivisionCountyCode: '',
    registeredDivisionStreetCode: '',
    registeredDivisionStreetName: '',
    legalRepresentative: '',
    legalRepresentativePhone: '',
    operatingName: '',
    actualOperatingStatus: '',
    actualAddress: '',
    actualDivisionAddress: '',
    divisionCode: '',
    divisionProvinceCode: '520000',
    divisionCityCode: '',
    divisionCountyCode: '',
    divisionStreetCode: '',
    divisionStreetName: '',
    contactName: '',
    contactPhone: '',
    economyIndustryCode: '',
    isStarIndustryCode: '',
    stateHolding: '',
    policeSystemStatus: '',
    policeSystemReason: '',
    inOriginalCultureTourismList: '',
    buildingOwnership: '',
    businessMode: '',
    businessModeRemark: '',
    ratingLevel: '',
    rooms: null,
    beds: null,
    staffCount: null,
    subjectType: '',
    otaPlatforms: [],
    otaOther: '',
    storefrontPhotos: [],
    groupPhotos: [],
    managerSignature: '',
    managerSignatureAt: '',
    sourceCatalogMatched: false,
    sourceCatalogName: '',
    submittedAt: '',
  }
}

export function buildCollectionFormFromUnit(unit = {}) {
  const form = createEmptyCollectionForm()
  form.location = unit.longitude && unit.latitude ? { longitude: unit.longitude, latitude: unit.latitude } : null
  form.locationAddress = unit.detailAddress || ''
  form.unitName = unit.name || ''
  form.checkType = unit.checkType || ''
  form.catalogSource = unit.catalogSource || ''
  form.licenseType = unit.licenseType || normalizeLicenseType(unit.licenseStatus)
  form.businessLicensePhoto = unit.businessLicensePhoto || ''
  form.businessLicensePhotoName = unit.businessLicensePhotoName || ''
  form.registeredName = unit.registeredName || unit.name || ''
  form.creditCode = unit.creditCode || ''
  form.registrationAuthority = unit.registrationAuthority || inferRegistrationAuthority(unit)
  form.registrationAuthorityOther = unit.registrationAuthorityOther || ''
  form.registrationDate = unit.openDate || ''
  form.registeredStatus = normalizeOperatingStatus(unit.operatingStatus)
  form.registeredAddress = unit.registeredAddress || unit.detailAddress || ''
  form.registeredDivisionAddress = unit.registeredDivisionAddress || ''
  form.registeredDivisionCode = unit.registeredDivisionCode || unit.divisionCode || (unit.countyCode ? `${unit.countyCode}000000` : '')
  form.registeredDivisionProvinceCode = unit.registeredDivisionProvinceCode || unit.provinceCode || '520000'
  form.registeredDivisionCityCode = unit.registeredDivisionCityCode || unit.cityCode || ''
  form.registeredDivisionCountyCode = unit.registeredDivisionCountyCode || unit.countyCode || ''
  form.registeredDivisionStreetCode = unit.registeredDivisionStreetCode || (form.registeredDivisionCode ? form.registeredDivisionCode.slice(6, 9) : '')
  form.registeredDivisionStreetName = unit.registeredDivisionStreetName || unit.divisionStreetName || ''
  form.legalRepresentative = unit.legalRepresentative || ''
  form.legalRepresentativePhone = unit.legalRepresentativePhone || ''
  form.operatingName = unit.operatingName || unit.name || ''
  form.actualOperatingStatus = normalizeOperatingStatus(unit.operatingStatus)
  form.actualAddress = unit.actualAddress || unit.detailAddress || ''
  form.actualDivisionAddress = unit.actualDivisionAddress || ''
  form.divisionCode = unit.divisionCode || (unit.countyCode ? `${unit.countyCode}000000` : '')
  form.divisionProvinceCode = unit.provinceCode || '520000'
  form.divisionCityCode = unit.cityCode || ''
  form.divisionCountyCode = unit.countyCode || ''
  form.divisionStreetCode = unit.divisionStreetCode || (form.divisionCode ? form.divisionCode.slice(6, 9) : '')
  form.divisionStreetName = unit.divisionStreetName || ''
  form.economyIndustryCode = unit.economyIndustryCode || unit.industryCode || inferIndustryCode(unit.category)
  form.isStarIndustryCode = unit.isStarIndustryCode || inferStarIndustryFlag(form.economyIndustryCode)
  form.stateHolding = unit.stateHolding || ''
  form.buildingOwnership = unit.buildingOwnership || ''
  form.businessMode = unit.businessMode || inferBusinessMode(unit.operatingStatus)
  form.businessModeRemark = unit.businessModeRemark || ''
  form.ratingLevel = unit.ratingLevel || normalizeRating(unit.starRating, unit.category)
  form.rooms = unit.rooms ?? null
  form.beds = unit.beds ?? null
  form.staffCount = unit.staffCount ?? null
  form.subjectType = unit.subjectType || inferSubjectType(unit.businessType, unit.rooms, unit.staffCount)
  form.policeSystemStatus = unit.policeSystemStatus || ''
  form.policeSystemReason = unit.policeSystemReason || ''
  form.inOriginalCultureTourismList = unit.inOriginalCultureTourismList || inferCultureTourismList(unit)
  form.otaPlatforms = parseStoredArray(unit.otaPlatforms)
  if (form.otaPlatforms.length === 0) form.otaPlatforms = inferOtaPlatforms(unit)
  form.otaOther = unit.otaOther || (form.otaPlatforms.includes('other') ? inferOtaOther(unit) : '')
  form.storefrontPhotos = parseStoredArray(unit.storefrontPhotos)
  form.groupPhotos = parseStoredArray(unit.groupPhotos)
  form.managerSignature = unit.managerSignature || ''
  form.managerSignatureAt = unit.managerSignatureAt || ''
  form.sourceCatalogMatched = Boolean(unit.id)
  form.sourceCatalogName = unit.sourceCatalogName || '导入住宿单位名录'
  return form
}

function parseStoredArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try { return JSON.parse(value) } catch { return [] }
}

function normalizeLicenseType(status) {
  if (status === 'licensed') return 'has_license'
  if (status === 'none') return 'no_license'
  if (status === 'pending') return 'other'
  return ''
}

function inferRegistrationAuthority(unit = {}) {
  if (unit.registrationAuthority) return unit.registrationAuthority
  if (unit.creditCode || ['企业法人', '个体工商户', '个人经营'].includes(unit.businessType)) return 'market'
  return ''
}

function normalizeOperatingStatus(status) {
  if (status === 'operating') return 'operating'
  if (['closed', 'suspended'].includes(status)) return 'suspended'
  if (status === 'renovating') return 'preparing'
  return status || ''
}

function inferIndustryCode(category) {
  const categoryMap = {
    star_hotel: '6110',
    non_star_hotel: '6129',
    minshuku: '6130',
    kezhan: '6129',
    other: '6190',
  }
  return categoryMap[category] || ''
}

export function inferStarIndustryFlag(industryCode) {
  if (!industryCode) return ''
  const option = INDUSTRY_OPTIONS.find(item => item.value === industryCode)
  if (!option) return ''
  return option.star ? 'yes' : 'no'
}

function inferBusinessMode(operatingStatus) {
  return operatingStatus === 'operating' ? 'stable' : ''
}

function normalizeRating(starRating, category) {
  if (starRating === 5) return 'five_star'
  if (starRating === 4) return 'four_star'
  if (starRating === 3) return 'three_star'
  if (starRating === 1 || starRating === 2) return 'two_or_below'
  if (category) return 'unrated'
  return starRating ? 'other' : ''
}

function inferSubjectType(businessType, rooms, staffCount) {
  if (businessType === '个体工商户' || businessType === '个人经营') return 'individual_business'
  if (businessType === '行政事业单位') return 'public_institution'
  if (businessType === '企业法人') return Number(rooms) >= 50 || Number(staffCount) >= 10 ? 'above_scale_enterprise' : 'below_scale_enterprise'
  return ''
}

function inferCultureTourismList(unit = {}) {
  const certifications = parseStoredArray(unit.certifications)
  if (unit.category === 'star_hotel') return 'yes'
  if (certifications.some(item => String(item).includes('星级') || String(item).includes('文旅'))) return 'yes'
  return ''
}

function inferOtaPlatforms(unit = {}) {
  const markets = parseStoredArray(unit.guestSourceMarkets)
  return markets.some(item => String(item).includes('线上')) ? ['other'] : []
}

function inferOtaOther(unit = {}) {
  const markets = parseStoredArray(unit.guestSourceMarkets)
  return markets.find(item => String(item).includes('线上')) || ''
}

export function extractAccommodationPatch(form) {
  return {
    name: form.operatingName || form.registeredName || form.unitName,
    creditCode: form.creditCode,
    detailAddress: form.actualAddress || form.registeredAddress,
    registeredName: form.registeredName,
    registeredAddress: form.registeredAddress,
    registeredDivisionAddress: form.registeredDivisionAddress,
    registeredDivisionCode: form.registeredDivisionCode,
    registeredDivisionProvinceCode: form.registeredDivisionProvinceCode,
    registeredDivisionCityCode: form.registeredDivisionCityCode,
    registeredDivisionCountyCode: form.registeredDivisionCountyCode,
    registeredDivisionStreetCode: form.registeredDivisionStreetCode,
    registeredDivisionStreetName: form.registeredDivisionStreetName,
    registrationDate: form.registrationDate,
    registrationAuthority: form.registrationAuthority,
    registrationAuthorityOther: form.registrationAuthorityOther,
    registeredStatus: form.registeredStatus,
    operatingName: form.operatingName,
    actualOperatingStatus: form.actualOperatingStatus,
    actualAddress: form.actualAddress,
    actualDivisionAddress: form.actualDivisionAddress,
    operatingStatus: form.actualOperatingStatus === 'operating' ? 'operating' : 'suspended',
    rooms: Number(form.rooms || 0),
    beds: Number(form.beds || 0),
    staffCount: Number(form.staffCount || 0),
    longitude: form.location?.longitude,
    latitude: form.location?.latitude,
    divisionCode: form.divisionCode,
    provinceCode: form.divisionProvinceCode || '520000',
    cityCode: form.divisionCityCode,
    countyCode: form.divisionCountyCode || String(form.divisionCode || '').slice(0, 6),
    divisionStreetCode: form.divisionStreetCode,
    divisionStreetName: form.divisionStreetName,
    industryCode: form.economyIndustryCode,
    legalRepresentative: form.legalRepresentative,
    legalRepresentativePhone: form.legalRepresentativePhone,
    contactName: form.contactName,
    contactPhone: form.contactPhone,
    checkType: form.checkType,
    catalogSource: form.catalogSource,
    licenseType: form.licenseType,
    economyIndustryCode: form.economyIndustryCode,
    isStarIndustryCode: form.isStarIndustryCode,
    stateHolding: form.stateHolding,
    buildingOwnership: form.buildingOwnership,
    businessMode: form.businessMode,
    businessModeRemark: form.businessModeRemark,
    ratingLevel: form.ratingLevel,
    policeSystemStatus: form.policeSystemStatus,
    policeSystemReason: form.policeSystemReason,
    inOriginalCultureTourismList: form.inOriginalCultureTourismList,
    otaPlatforms: JSON.stringify(form.otaPlatforms || []),
    otaOther: form.otaOther,
    businessLicensePhoto: form.businessLicensePhoto,
    businessLicensePhotoName: form.businessLicensePhotoName,
    storefrontPhotos: JSON.stringify(form.storefrontPhotos || []),
    groupPhotos: JSON.stringify(form.groupPhotos || []),
    managerSignature: form.managerSignature,
    managerSignatureAt: form.managerSignatureAt,
    subjectType: form.subjectType,
    updatedAt: new Date().toISOString(),
  }
}
