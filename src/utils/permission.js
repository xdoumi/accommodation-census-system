export const PERMISSION_TREE = [
  {
    value: 'dashboard',
    label: '工作台',
    children: [
      { value: 'dashboard:view', label: '查看工作台' },
    ],
  },
  {
    value: 'accommodation',
    label: '住宿单位',
    children: [
      {
        value: 'accommodation:list',
        label: '单位列表',
        children: [
          { value: 'accommodation:view', label: '查看' },
          { value: 'accommodation:export', label: '导出' },
        ],
      },
      {
        value: 'accommodation:review-list',
        label: '审核单位列表',
        children: [
          { value: 'census:review', label: '审核' },
          { value: 'accommodation:review:view', label: '查看' },
          { value: 'accommodation:review:export', label: '导出' },
        ],
      },
      {
        value: 'accommodation:deleted-list',
        label: '删除管理',
        children: [
          { value: 'accommodation:delete', label: '删除/查看删除记录' },
          { value: 'accommodation:restore', label: '恢复' },
        ],
      },
      {
        value: 'accommodation:import-page',
        label: '批量导入',
        children: [
          { value: 'accommodation:import', label: '导入' },
        ],
      },
    ],
  },
  {
    value: 'census',
    label: '普查任务',
    children: [
      {
        value: 'census:task-list',
        label: '任务列表',
        children: [
          { value: 'census:view', label: '查看' },
          { value: 'census:create', label: '创建' },
          { value: 'census:update', label: '编辑' },
          { value: 'census:delete', label: '删除' },
          { value: 'census:fill', label: '数据填报' },
        ],
      },
    ],
  },
  {
    value: 'statistics',
    label: '数据统计',
    children: [
      {
        value: 'statistics:overview',
        label: '统计概览',
        children: [
          { value: 'statistics:view', label: '查看' },
        ],
      },
      {
        value: 'statistics:map',
        label: '地图分布',
        children: [
          { value: 'statistics:map:view', label: '查看' },
        ],
      },
      {
        value: 'statistics:report',
        label: '报表导出',
        children: [
          { value: 'statistics:export', label: '导出' },
        ],
      },
    ],
  },
  {
    value: 'system',
    label: '系统管理',
    children: [
      {
        value: 'system:user-page',
        label: '用户管理',
        children: [
          { value: 'system:user:view', label: '查看' },
          { value: 'system:user:create', label: '新增' },
          { value: 'system:user:update', label: '编辑' },
          { value: 'system:user:status', label: '启用/禁用' },
          { value: 'system:user:reset_password', label: '重置密码' },
          { value: 'system:user:delete', label: '删除' },
        ],
      },
      {
        value: 'system:role-page',
        label: '角色权限',
        children: [
          { value: 'system:role:view', label: '查看' },
          { value: 'system:role:create', label: '新增角色' },
          { value: 'system:role:update', label: '编辑权限' },
          { value: 'system:role:delete', label: '删除角色' },
        ],
      },
      {
        value: 'system:ai-page',
        label: 'AI 设置',
        children: [
          { value: 'system:ai:manage', label: '管理' },
        ],
      },
    ],
  },
]

function flattenPermissionTree(nodes) {
  return nodes.flatMap(node => node.children?.length ? flattenPermissionTree(node.children) : [node])
}

export const ALL_PERMISSIONS = flattenPermissionTree(PERMISSION_TREE)
export const PERMISSION_GROUPS = PERMISSION_TREE.map(group => ({
  label: group.label,
  permissions: flattenPermissionTree(group.children || []),
}))
export const ROLE_PERMISSION_STORAGE_KEY = 'census_role_permissions'

// 角色权限映射
export const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: [
    'dashboard:view',
    'accommodation:view', 'accommodation:create', 'accommodation:update', 'accommodation:delete', 'accommodation:import', 'accommodation:export',
    'accommodation:review:view', 'accommodation:review:export', 'accommodation:restore',
    'census:view', 'census:create', 'census:update', 'census:delete', 'census:fill', 'census:review',
    'statistics:view', 'statistics:map:view', 'statistics:export',
    'system:user:view', 'system:user:create', 'system:user:update', 'system:user:status', 'system:user:reset_password', 'system:user:delete',
    'system:role:view', 'system:role:create', 'system:role:update', 'system:role:delete',
    'system:ai:manage',
  ],
  provincial_admin: [
    'dashboard:view',
    'accommodation:view', 'accommodation:create', 'accommodation:update', 'accommodation:delete', 'accommodation:import', 'accommodation:export',
    'accommodation:review:view', 'accommodation:review:export', 'accommodation:restore',
    'census:view', 'census:create', 'census:update', 'census:delete', 'census:fill', 'census:review',
    'statistics:view', 'statistics:map:view', 'statistics:export',
    'system:user:view', 'system:user:create', 'system:user:update', 'system:user:status', 'system:user:reset_password',
    'system:role:view', 'system:role:create', 'system:role:update', 'system:role:delete',
    'system:ai:manage',
  ],
  city_admin: [
    'dashboard:view',
    'accommodation:view', 'accommodation:create', 'accommodation:update', 'accommodation:export', 'accommodation:review:view',
    'census:view', 'census:fill', 'census:review',
    'statistics:view', 'statistics:map:view',
    'system:user:view', 'system:user:create', 'system:user:update',
  ],
  county_admin: [
    'dashboard:view',
    'accommodation:view', 'accommodation:create', 'accommodation:update', 'accommodation:review:view',
    'census:view', 'census:fill', 'census:review',
    'statistics:view', 'statistics:map:view',
  ],
  enumerator: [
    'dashboard:view',
    'accommodation:view',
    'census:view', 'census:fill',
    'statistics:view',
  ],
}

/**
 * 获取角色权限列表
 */
export function getPermissionsByRole(role) {
  const configured = loadRolePermissionConfig()
  const source = configured?.[role] || DEFAULT_ROLE_PERMISSIONS[role] || []
  const valid = new Set(ALL_PERMISSIONS.map(item => item.value))
  return source.filter(permission => valid.has(permission))
}

/**
 * 检查角色是否有某权限
 */
export function hasPermission(role, permission) {
  const perms = getPermissionsByRole(role)
  return perms.includes(permission)
}

export function loadRolePermissionConfig() {
  try {
    const raw = localStorage.getItem(ROLE_PERMISSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const valid = new Set(ALL_PERMISSIONS.map(item => item.value))
    const cleaned = {}
    Object.keys(parsed).forEach(role => {
      if (role === 'reviewer') return
      cleaned[role] = Array.isArray(parsed[role]) ? parsed[role].filter(item => valid.has(item)) : []
    })
    return cleaned
  } catch {
    return null
  }
}

export function saveRolePermissionConfig(config) {
  const valid = new Set(ALL_PERMISSIONS.map(item => item.value))
  const cleaned = {}
  Object.keys(config || {}).forEach(role => {
    if (role === 'reviewer') return
    cleaned[role] = Array.from(new Set(config[role] || [])).filter(item => valid.has(item))
  })
  localStorage.setItem(ROLE_PERMISSION_STORAGE_KEY, JSON.stringify(cleaned))
}

export function resetRolePermissionConfig() {
  localStorage.removeItem(ROLE_PERMISSION_STORAGE_KEY)
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

export default DEFAULT_ROLE_PERMISSIONS
