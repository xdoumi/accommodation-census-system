import db from './index'

/**
 * 获取区域树形结构
 */
export async function getAreaTree() {
  const areas = await db.areas.toArray()
  return buildTree(areas)
}

/**
 * 根据编码获取区域
 */
export async function getAreaByCode(code) {
  return await db.areas.get(code)
}

/**
 * 获取某级别的所有区域
 */
export async function getAreasByLevel(level) {
  return await db.areas.where('level').equals(level).toArray()
}

/**
 * 获取某区域的子区域
 */
export async function getChildAreas(parentCode) {
  return await db.areas.where('parentCode').equals(parentCode).sortBy('sortOrder')
}

/**
 * 构建树形结构
 */
function buildTree(areas) {
  const map = {}
  const roots = []

  areas.forEach(area => {
    map[area.code] = { ...area, children: [] }
  })

  areas.forEach(area => {
    if (area.parentCode && map[area.parentCode]) {
      map[area.parentCode].children.push(map[area.code])
    } else {
      roots.push(map[area.code])
    }
  })

  return roots
}

/**
 * 获取区域名称链
 */
export async function getAreaNameChain(code) {
  const names = []
  let current = await db.areas.get(code)
  while (current) {
    names.unshift(current.name)
    current = current.parentCode ? await db.areas.get(current.parentCode) : null
  }
  return names.join(' / ')
}
