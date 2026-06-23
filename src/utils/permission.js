// 角色权限映射
const ROLE_PERMISSIONS = {
  super_admin: [
    'accommodation:view', 'accommodation:create', 'accommodation:update', 'accommodation:delete', 'accommodation:import', 'accommodation:export',
    'census:view', 'census:create', 'census:update', 'census:fill', 'census:review',
    'statistics:view', 'statistics:export',
    'system:user:view', 'system:user:create', 'system:user:update',
    'system:role:view',
    'system:ai:manage',
  ],
  provincial_admin: [
    'accommodation:view', 'accommodation:create', 'accommodation:update', 'accommodation:delete', 'accommodation:import', 'accommodation:export',
    'census:view', 'census:create', 'census:update', 'census:fill', 'census:review',
    'statistics:view', 'statistics:export',
    'system:user:view', 'system:user:create', 'system:user:update',
    'system:ai:manage',
  ],
  city_admin: [
    'accommodation:view', 'accommodation:create', 'accommodation:update', 'accommodation:export',
    'census:view', 'census:fill', 'census:review',
    'statistics:view',
    'system:user:view',
  ],
  county_admin: [
    'accommodation:view', 'accommodation:create', 'accommodation:update',
    'census:view', 'census:fill', 'census:review',
    'statistics:view',
  ],
  enumerator: [
    'accommodation:view',
    'census:view', 'census:fill',
    'statistics:view',
  ],
  reviewer: [
    'accommodation:view',
    'census:review',
    'statistics:view',
  ],
}

/**
 * 获取角色权限列表
 */
export function getPermissionsByRole(role) {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * 检查角色是否有某权限
 */
export function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || []
  return perms.includes(permission)
}

/**
 * 获取区域级别的下级区域级别
 */
export function getChildAreaLevel(role) {
  switch (role) {
    case 'super_admin':
    case 'provincial_admin':
      return [2, 3] // 可看到市和县
    case 'city_admin':
      return [3] // 可看到县
    default:
      return []
  }
}

export default ROLE_PERMISSIONS
