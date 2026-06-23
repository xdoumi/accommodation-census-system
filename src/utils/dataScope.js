/**
 * 数据权限范围工具
 * 根据用户角色和 areaCode 判断某条住宿单位记录是否在可见范围内
 *
 * areaCode 约定：
 *   - 省级：'520000'
 *   - 市级：'5201xx' / '5203xx' 等（第3-4位为市码，第5-6位为区县码 '00' 表示市级）
 *   - 县级：完整 6 位
 */

function getCityPrefix(areaCode) {
  if (!areaCode) return ''
  return areaCode.substring(0, 4) // 例如 '5201'
}

/**
 * 给定一条住宿单位记录，判断当前用户能否看到
 */
export function inUserScope(item, role, userAreaCode) {
  if (!role) return false
  if (['super_admin', 'provincial_admin'].includes(role)) return true

  switch (role) {
    case 'city_admin':
      // 市级管理员：本市
      return item.cityCode === userAreaCode
    case 'county_admin':
    case 'enumerator':
      // 县级/普查员：本县
      return item.countyCode === userAreaCode
    case 'reviewer': {
      // 审核员：areaCode 可能是省/市/县级
      if (userAreaCode === '520000') return true               // 省级审核员
      if (userAreaCode.endsWith('00')) {                       // 市级审核员
        return getCityPrefix(item.cityCode) === getCityPrefix(userAreaCode)
      }
      return item.countyCode === userAreaCode                  // 县级审核员
    }
    default:
      return false
  }
}

/**
 * 对一批住宿单位记录做权限过滤
 */
export function filterByScope(items, role, userAreaCode) {
  if (['super_admin', 'provincial_admin'].includes(role)) return items
  return items.filter(item => inUserScope(item, role, userAreaCode))
}
