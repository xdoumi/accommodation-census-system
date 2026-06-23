// 住宿单位类别
export const CATEGORY_OPTIONS = [
  { value: 'star_hotel', label: '星级酒店', color: '#e6a23c' },
  { value: 'non_star_hotel', label: '非星级酒店', color: '#409eff' },
  { value: 'minshuku', label: '民宿', color: '#67c23a' },
  { value: 'kezhan', label: '客栈', color: '#9b59b6' },
  { value: 'other', label: '其他', color: '#909399' },
]

// 类别映射
export const CATEGORY_MAP = Object.fromEntries(CATEGORY_OPTIONS.map(c => [c.value, c.label]))
export const CATEGORY_COLOR_MAP = Object.fromEntries(CATEGORY_OPTIONS.map(c => [c.value, c.color]))

// 经营状态
export const OPERATING_STATUS_OPTIONS = [
  { value: 'operating', label: '正常营业', type: 'success' },
  { value: 'closed', label: '停业', type: 'danger' },
  { value: 'renovating', label: '装修中', type: 'warning' },
  { value: 'suspended', label: '暂停营业', type: 'info' },
]

export const OPERATING_STATUS_MAP = Object.fromEntries(OPERATING_STATUS_OPTIONS.map(s => [s.value, s.label]))

// 证照状态
export const LICENSE_STATUS_OPTIONS = [
  { value: 'licensed', label: '已办证', type: 'success' },
  { value: 'pending', label: '办理中', type: 'warning' },
  { value: 'none', label: '未办证', type: 'danger' },
]

export const LICENSE_STATUS_MAP = Object.fromEntries(LICENSE_STATUS_OPTIONS.map(s => [s.value, s.label]))

// 经营主体类型
export const BUSINESS_TYPE_OPTIONS = [
  { value: '企业法人', label: '企业法人' },
  { value: '个体工商户', label: '个体工商户' },
  { value: '个人经营', label: '个人经营' },
]

// 星级
export const STAR_RATING_OPTIONS = [
  { value: 5, label: '五星级' },
  { value: 4, label: '四星级' },
  { value: 3, label: '三星级' },
  { value: 2, label: '二星级' },
  { value: 1, label: '一星级' },
]

// 消防验收
export const FIRE_INSPECTION_OPTIONS = [
  { value: 'passed', label: '已通过', type: 'success' },
  { value: 'pending', label: '待验收', type: 'warning' },
  { value: 'failed', label: '未通过', type: 'danger' },
]

export const FIRE_INSPECTION_MAP = Object.fromEntries(FIRE_INSPECTION_OPTIONS.map(f => [f.value, f.label]))

// 卫生许可
export const HEALTH_PERMIT_OPTIONS = [
  { value: 'valid', label: '有效', type: 'success' },
  { value: 'expired', label: '已过期', type: 'warning' },
  { value: 'none', label: '无', type: 'danger' },
]

export const HEALTH_PERMIT_MAP = Object.fromEntries(HEALTH_PERMIT_OPTIONS.map(h => [h.value, h.label]))

// 角色选项
export const ROLE_OPTIONS = [
  { value: 'super_admin', label: '超级管理员' },
  { value: 'provincial_admin', label: '省级管理员' },
  { value: 'city_admin', label: '市级管理员' },
  { value: 'county_admin', label: '县级管理员' },
  { value: 'enumerator', label: '普查员' },
  { value: 'reviewer', label: '审核员' },
]

export const ROLE_MAP = Object.fromEntries(ROLE_OPTIONS.map(r => [r.value, r.label]))

// 用户状态
export const USER_STATUS_OPTIONS = [
  { value: 'active', label: '正常', type: 'success' },
  { value: 'disabled', label: '禁用', type: 'danger' },
]

export const USER_STATUS_MAP = Object.fromEntries(USER_STATUS_OPTIONS.map(s => [s.value, s.label]))

// 普查任务状态
export const CENSUS_TASK_STATUS_OPTIONS = [
  { value: 'draft', label: '草稿', type: 'info' },
  { value: 'published', label: '已发布', type: '' },
  { value: 'in_progress', label: '进行中', type: 'warning' },
  { value: 'completed', label: '已完成', type: 'success' },
]

export const CENSUS_TASK_STATUS_MAP = Object.fromEntries(CENSUS_TASK_STATUS_OPTIONS.map(s => [s.value, s.label]))

// 普查分配状态
export const CENSUS_ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'pending', label: '待填报', type: 'info' },
  { value: 'in_progress', label: '填报中', type: '' },
  { value: 'submitted', label: '已提交', type: 'warning' },
  { value: 'reviewed', label: '已审核', type: 'success' },
  { value: 'rejected', label: '已驳回', type: 'danger' },
]

export const CENSUS_ASSIGNMENT_STATUS_MAP = Object.fromEntries(CENSUS_ASSIGNMENT_STATUS_OPTIONS.map(s => [s.value, s.label]))

// 填报记录状态
export const CENSUS_RECORD_STATUS_OPTIONS = [
  { value: 'draft', label: '草稿', type: 'info' },
  { value: 'submitted', label: '县级待审', type: 'warning' },
  { value: 'pending_county_review', label: '县级待审', type: 'warning' },
  { value: 'county_rejected', label: '县级已驳回', type: 'danger' },
  { value: 'pending_city_review', label: '市级待审', type: 'warning' },
  { value: 'city_rejected', label: '市级已驳回', type: 'danger' },
  { value: 'pending_province_review', label: '省级待审', type: 'warning' },
  { value: 'province_rejected', label: '省级已驳回', type: 'danger' },
  { value: 'approved', label: '可用', type: 'success' },
  { value: 'available', label: '可用', type: 'success' },
  { value: 'rejected', label: '已驳回', type: 'danger' },
]

export const CENSUS_RECORD_STATUS_MAP = Object.fromEntries(CENSUS_RECORD_STATUS_OPTIONS.map(s => [s.value, s.label]))

// 客源市场选项
export const GUEST_SOURCE_OPTIONS = ['国内散客', '国内团队', '入境散客', '入境团队', '商务客', '线上预订']

// 品牌选项
export const BRAND_OPTIONS = ['如家', '汉庭', '7天', '锦江之星', '全季', '亚朵', '希尔顿', '洲际', '万豪', '香格里拉', '悦榕庄', '松赞', '花间堂', '宛若故里']

// 证书选项
export const CERTIFICATION_OPTIONS = ['绿色饭店', '金叶级绿色饭店', '银叶级绿色饭店', '星级旅游饭店', '文化主题酒店']

// 区域级别
export const AREA_LEVEL = { 1: '省级', 2: '市级', 3: '县级' }
