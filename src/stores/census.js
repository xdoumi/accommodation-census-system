import { defineStore } from 'pinia'
import { ref } from 'vue'
import db from '@/db'
import { useAuthStore } from './auth'
import { INITIAL_REVIEW_STATUS } from '@/utils/reviewFlow'

export const useCensusStore = defineStore('census', () => {
  const tasks = ref([])
  const currentTask = ref(null)
  const subTasks = ref([])
  const assignments = ref([])
  const records = ref([])
  const taskLoading = ref(false)
  const assignmentLoading = ref(false)

  async function fetchTasks(filters = {}) {
    taskLoading.value = true
    try {
      const allTasks = await db.censusTasks.toArray()
      const requestedTaskType = filters.taskType || 'main'

      // 权限过滤
      const auth = useAuthStore()
      const filtered = allTasks.filter(task => {
        const taskType = task.taskType || 'main'
        if (['enumerator'].includes(auth.userRole)) {
          return taskType === 'sub' && isUserResponsible(task, auth.currentUser?.id)
        }
        if (taskType !== requestedTaskType) return false
        if (['super_admin', 'provincial_admin'].includes(auth.userRole)) return true
        return isTaskVisibleForScopedRole(task, {
          requestedTaskType,
          allTasks,
          role: auth.userRole,
          userId: auth.currentUser?.id,
          userAreaCode: auth.userAreaCode,
        })
      })

      // 状态过滤
      const finalList = filters.status
        ? filtered.filter(t => t.status === filters.status)
        : filtered

      tasks.value = finalList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } finally {
      taskLoading.value = false
    }
  }

  async function fetchTaskDetail(id) {
    taskLoading.value = true
    try {
      currentTask.value = await db.censusTasks.get(Number(id))
      if (currentTask.value) {
        if ((currentTask.value.taskType || 'main') === 'main') {
          subTasks.value = await db.censusTasks.where('parentTaskId').equals(Number(id)).toArray()
          subTasks.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          for (const subTask of subTasks.value) {
            await syncAssignmentsForSubTask(subTask.id)
          }
          const subTaskIds = subTasks.value.map(t => t.id)
          assignments.value = await fetchAssignmentsByTaskIds(subTaskIds)
          assignments.value = await hydrateAssignmentStats(assignments.value)
        } else {
          subTasks.value = []
          await syncAssignmentsForSubTask(Number(id))
          assignments.value = await db.censusAssignments.where('taskId').equals(Number(id)).toArray()
          assignments.value = await hydrateAssignmentStats(assignments.value)
        }
      } else {
        assignments.value = []
        subTasks.value = []
      }
      return assignments.value
    } finally {
      taskLoading.value = false
    }
  }

  async function createTask(data) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const id = await db.censusTasks.add({
      ...data,
      taskType: data.taskType || 'main',
      status: 'draft',
      createdBy: auth.currentUser?.id,
      createdAt: now,
      updatedAt: now,
    })
    return id
  }

  async function updateTask(id, data) {
    const now = new Date().toISOString()
    await db.censusTasks.update(Number(id), { ...data, updatedAt: now })
  }

  async function publishTask(id) {
    const task = await db.censusTasks.get(Number(id))
    if (!task) return

    const now = new Date().toISOString()
    await db.censusTasks.update(Number(id), { status: 'published', updatedAt: now })
    if ((task.taskType || 'main') === 'sub') {
      await syncAssignmentsForSubTask(Number(id))
    }
  }

  async function fetchSubTasks(parentTaskId) {
    subTasks.value = await db.censusTasks.where('parentTaskId').equals(Number(parentTaskId)).toArray()
    subTasks.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return subTasks.value
  }

  async function createSubTask(parentTaskId, data) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const id = await db.censusTasks.add({
      ...data,
      parentTaskId: Number(parentTaskId),
      taskType: 'sub',
      status: data.status || 'published',
      createdBy: auth.currentUser?.id,
      createdAt: now,
      updatedAt: now,
    })
    await syncAssignmentsForSubTask(id)
    return id
  }

  async function updateSubTask(id, data) {
    const taskId = Number(id)
    const task = await db.censusTasks.get(taskId)
    if (!task) return
    await db.censusTasks.update(taskId, {
      ...data,
      updatedAt: new Date().toISOString(),
    })
    await syncAssignmentsForSubTask(taskId)
  }

  async function syncAssignmentsForSubTask(taskId) {
    const task = await db.censusTasks.get(Number(taskId))
    if (!task) return
    const now = new Date().toISOString()
    const areaCodes = JSON.parse(task.assignedAreaCodes || '[]')
    const assignmentAreaCodes = await getAssignmentAreaCodesFromSelection(areaCodes)
    const responsibleUserIds = JSON.parse(task.responsibleUserIds || '[]')
    const cityAdminIds = JSON.parse(task.cityAdminIds || '[]')
    const countyAdminIds = JSON.parse(task.countyAdminIds || '[]')
    const assignedTo = responsibleUserIds[0] || null
    const existingAssignments = await db.censusAssignments.where('taskId').equals(Number(taskId)).toArray()
    const validAreaCodes = new Set(assignmentAreaCodes.map(code => String(code)))

    for (const assignment of existingAssignments) {
      if (validAreaCodes.has(String(assignment.areaCode))) continue
      await db.censusRecords.where('assignmentId').equals(Number(assignment.id)).delete()
      await db.censusAssignments.delete(Number(assignment.id))
    }

    for (const areaCode of assignmentAreaCodes) {
      const existing = await db.censusAssignments.where({ taskId: Number(taskId), areaCode }).first()
      const area = await db.areas.get(areaCode)
      const targetUnits = await getUnitsForAssignedArea(areaCode)
      const targetAccommodationIds = targetUnits.map(item => item.id)
      const spotCheckCount = targetUnits.filter(item => item.checkType === 'catalog_spot_check').length
      const importedCheckCount = targetUnits.filter(item => item.checkType === 'imported_catalog').length
      const unitPatch = {
        targetAccommodationIds: JSON.stringify(targetAccommodationIds),
        unitCount: targetAccommodationIds.length,
        spotCheckCount,
        importedCheckCount,
      }
      if (!existing) {
        await db.censusAssignments.add({
          taskId: Number(taskId),
          parentTaskId: task.parentTaskId || null,
          areaCode,
          areaName: area?.name || areaCode,
          assignedTo,
          assignedToIds: JSON.stringify(responsibleUserIds),
          assignedToName: task.responsibleUserNames || '',
          cityAdminIds: JSON.stringify(cityAdminIds),
          cityAdminNames: task.cityAdminNames || '',
          countyAdminIds: JSON.stringify(countyAdminIds),
          countyAdminNames: task.countyAdminNames || '',
          status: 'pending',
          progress: 0,
          submittedAt: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewComment: null,
          ...unitPatch,
          createdAt: now,
          updatedAt: now,
        })
      } else {
        await db.censusAssignments.update(existing.id, {
          assignedTo,
          assignedToIds: JSON.stringify(responsibleUserIds),
          assignedToName: task.responsibleUserNames || '',
          cityAdminIds: JSON.stringify(cityAdminIds),
          cityAdminNames: task.cityAdminNames || '',
          countyAdminIds: JSON.stringify(countyAdminIds),
          countyAdminNames: task.countyAdminNames || '',
          ...unitPatch,
          updatedAt: now,
        })
      }
    }
  }

  async function getAssignmentAreaCodesFromSelection(areaCodes = []) {
    const allAreas = await db.areas.toArray()
    const areaByCode = new Map(allAreas.map(item => [String(item.code), item]))
    const countiesByCity = new Map()

    allAreas.filter(item => item.level === 3).forEach(item => {
      const cityCode = String(item.parentCode || '')
      if (!countiesByCity.has(cityCode)) countiesByCity.set(cityCode, [])
      countiesByCity.get(cityCode).push(String(item.code))
    })

    const selectedCountiesByCity = new Map()
    const addCounty = (countyCode) => {
      const county = areaByCode.get(String(countyCode))
      const cityCode = String(county?.parentCode || '')
      if (!county || !cityCode) return
      if (!selectedCountiesByCity.has(cityCode)) selectedCountiesByCity.set(cityCode, new Set())
      selectedCountiesByCity.get(cityCode).add(String(county.code))
    }
    const addCity = (cityCode) => {
      ;(countiesByCity.get(String(cityCode)) || []).forEach(addCounty)
    }

    const normalizedCodes = Array.isArray(areaCodes) ? [...new Set(areaCodes.map(code => String(code)))] : []
    if (!normalizedCodes.length || normalizedCodes.includes('520000')) {
      countiesByCity.forEach(counties => counties.forEach(addCounty))
    } else {
      normalizedCodes.forEach(code => {
        const area = areaByCode.get(code)
        if (!area) return
        if (area.level === 1 || code === '520000') {
          countiesByCity.forEach(counties => counties.forEach(addCounty))
          return
        }
        if (area.level === 2 || code.endsWith('00')) {
          addCity(code)
          return
        }
        addCounty(code)
      })
    }

    const orderedCityCodes = [...countiesByCity.keys()].sort()
    const assignmentCodes = []
    orderedCityCodes.forEach(cityCode => {
      const allCounties = countiesByCity.get(cityCode) || []
      const selectedCounties = selectedCountiesByCity.get(cityCode)
      if (!selectedCounties?.size) return
      if (selectedCounties.size === allCounties.length) {
        assignmentCodes.push(cityCode)
        return
      }
      allCounties.forEach(countyCode => {
        if (selectedCounties.has(countyCode)) assignmentCodes.push(countyCode)
      })
    })

    return assignmentCodes
  }

  async function getUnitsForAssignedArea(areaCode) {
    const area = await db.areas.get(areaCode)
    const list = await db.accommodations.filter(item => {
      if (item.deletedAt) return false
      if (area?.level === 1 || areaCode === '520000') return true
      if (area?.level === 2 || areaCode.endsWith('00')) return item.cityCode === areaCode
      return item.countyCode === areaCode
    }).toArray()
    return list
  }

  async function hydrateAssignmentStats(list = []) {
    const result = []
    for (const assignment of list) {
      if (Number(assignment.unitCount || 0) > 0 && assignment.targetAccommodationIds) {
        result.push(assignment)
        continue
      }
      const targetUnits = await getUnitsForAssignedArea(assignment.areaCode)
      const patch = {
        targetAccommodationIds: JSON.stringify(targetUnits.map(item => item.id)),
        unitCount: targetUnits.length,
        spotCheckCount: targetUnits.filter(item => item.checkType === 'catalog_spot_check').length,
        importedCheckCount: targetUnits.filter(item => item.checkType === 'imported_catalog').length,
      }
      await db.censusAssignments.update(assignment.id, patch)
      result.push({ ...assignment, ...patch })
    }
    return result
  }

  async function startTask(id) {
    await db.censusTasks.update(Number(id), { status: 'in_progress', updatedAt: new Date().toISOString() })
  }

  async function completeTask(id) {
    await db.censusTasks.update(Number(id), { status: 'completed', updatedAt: new Date().toISOString() })
  }

  async function removeTask(id) {
    const taskId = Number(id)
    const task = await db.censusTasks.get(taskId)
    if (!task) return
    if (task.status !== 'draft') throw new Error('只有草稿状态的任务可以删除')

    const childTasks = await db.censusTasks.where('parentTaskId').equals(taskId).toArray()
    const taskIds = [taskId, ...childTasks.map(item => item.id)]
    for (const tid of taskIds) {
      const assignments = await db.censusAssignments.where('taskId').equals(Number(tid)).toArray()
      const assignmentIds = assignments.map(item => item.id)
      for (const assignmentId of assignmentIds) {
        await db.censusRecords.where('assignmentId').equals(Number(assignmentId)).delete()
      }
      await db.censusRecords.where('taskId').equals(Number(tid)).delete()
      await db.censusAssignments.where('taskId').equals(Number(tid)).delete()
      await db.censusTasks.delete(Number(tid))
    }
  }

  async function removeSubTask(id) {
    const taskId = Number(id)
    const task = await db.censusTasks.get(taskId)
    if (!task) return
    if ((task.taskType || 'main') !== 'sub') throw new Error('只能删除子任务')
    if (task.status === 'in_progress') throw new Error('启动中的任务不支持删除')

    const assignments = await db.censusAssignments.where('taskId').equals(taskId).toArray()
    for (const assignment of assignments) {
      await db.censusRecords.where('assignmentId').equals(Number(assignment.id)).delete()
    }
    await db.censusRecords.where('taskId').equals(taskId).delete()
    await db.censusAssignments.where('taskId').equals(taskId).delete()
    await db.censusTasks.delete(taskId)
  }

  async function updateAssignment(id, data) {
    await db.censusAssignments.update(Number(id), { ...data, updatedAt: new Date().toISOString() })
  }

  async function submitAssignment(id) {
    await db.censusAssignments.update(Number(id), {
      status: 'submitted',
      progress: 100,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  async function reviewAssignment(id, status, comment) {
    const auth = useAuthStore()
    await db.censusAssignments.update(Number(id), {
      status,
      reviewComment: comment,
      reviewedBy: auth.currentUser?.id,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  async function fetchRecords(assignmentId) {
    assignmentLoading.value = true
    try {
      records.value = await db.censusRecords.where('assignmentId').equals(Number(assignmentId)).toArray()
    } finally {
      assignmentLoading.value = false
    }
  }

  async function saveRecord(data) {
    const auth = useAuthStore()
    const now = new Date().toISOString()

    if (data.id) {
      await db.censusRecords.update(Number(data.id), { ...data, updatedAt: now })
      return data.id
    } else {
      return await db.censusRecords.add({
        ...data,
        filledBy: auth.currentUser?.id,
        status: data.status || 'draft',
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  async function submitRecord(id) {
    await db.censusRecords.update(Number(id), {
      status: INITIAL_REVIEW_STATUS,
      submittedAt: new Date().toISOString(),
      reviewLevel: 'county',
      reviewAction: 'submit',
      updatedAt: new Date().toISOString(),
    })
  }

  function calculateProgress(taskAssignments) {
    if (!taskAssignments || taskAssignments.length === 0) return 0
    const total = taskAssignments.length
    const completed = taskAssignments.filter(a => ['submitted', 'reviewed', 'available'].includes(a.status)).length
    return Math.round(completed / total * 100)
  }

  async function fetchAssignmentsByTaskIds(taskIds) {
    if (!taskIds?.length) return []
    const result = []
    for (const tid of taskIds) {
      const list = await db.censusAssignments.where('taskId').equals(Number(tid)).toArray()
      result.push(...list)
    }
    return result
  }

  /** 加载当前用户被分配的全部 assignments（移动端首页/任务列表用） */
  async function fetchMyAssignments() {
    const auth = useAuthStore()
    const uid = auth.currentUser?.id
    if (!uid) {
      assignments.value = []
      return []
    }
    const allSubTasks = (await db.censusTasks.toArray()).filter(task => (task.taskType || 'main') === 'sub')
    for (const task of allSubTasks) {
      await syncAssignmentsForSubTask(task.id)
    }
    if (['super_admin', 'provincial_admin'].includes(auth.userRole)) {
      assignments.value = await db.censusAssignments.toArray()
    } else if (['enumerator'].includes(auth.userRole)) {
      const all = await db.censusAssignments.toArray()
      assignments.value = all.filter(a => {
        if (a.assignedTo === uid) return true
        try { return JSON.parse(a.assignedToIds || '[]').includes(uid) } catch { return false }
      })
    } else {
      const parseIds = (raw) => {
        try { return JSON.parse(raw || '[]') } catch { return [] }
      }
      const all = await db.censusAssignments.toArray()
      assignments.value = all.filter(a => {
        if (auth.userRole === 'county_admin') {
          if (parseIds(a.countyAdminIds).includes(uid)) return true
          return a.areaCode === auth.userAreaCode
        }
        if (auth.userRole === 'city_admin') {
          if (parseIds(a.cityAdminIds).includes(uid)) return true
          return a.areaCode.startsWith(auth.userAreaCode.substring(0, 4))
        }
        return false
      })
    }
    assignments.value = await hydrateAssignmentStats(assignments.value)
    return assignments.value
  }

  return {
    tasks, currentTask, subTasks, assignments, records, taskLoading, assignmentLoading,
    fetchTasks, fetchTaskDetail, fetchAssignmentsByTaskIds, fetchMyAssignments,
    fetchSubTasks, createTask, createSubTask, updateTask, updateSubTask, publishTask, startTask, completeTask, removeTask, removeSubTask,
    updateAssignment, submitAssignment, reviewAssignment,
    fetchRecords, saveRecord, submitRecord, calculateProgress,
  }
})

function isUserResponsible(task, userId) {
  if (!userId) return false
  try {
    return JSON.parse(task.responsibleUserIds || '[]').includes(userId)
  } catch {
    return false
  }
}

function parseJsonArray(raw) {
  try {
    return Array.isArray(raw) ? raw.map(item => String(item)) : JSON.parse(raw || '[]').map(item => String(item))
  } catch {
    return []
  }
}

function getTaskAreaCodes(task) {
  const taskType = task?.taskType || 'main'
  return taskType === 'main'
    ? parseJsonArray(task.scopeAreaCodes || task.assignedAreaCodes)
    : parseJsonArray(task.assignedAreaCodes)
}

function isExplicitReviewer(task, role, userId) {
  if (!task || !userId) return false
  if (role === 'city_admin') return parseJsonArray(task.cityAdminIds).includes(String(userId))
  if (role === 'county_admin') return parseJsonArray(task.countyAdminIds).includes(String(userId))
  return false
}

function areaCodeMatchesRoleScope(areaCode, role, userAreaCode) {
  const code = String(areaCode || '')
  const scopedArea = String(userAreaCode || '')
  if (!code || !scopedArea) return false
  if (code === '520000') return true

  const cityPrefix = scopedArea.substring(0, 4)
  if (role === 'city_admin') {
    return code === scopedArea || code.startsWith(cityPrefix)
  }

  if (role === 'county_admin') {
    return code === scopedArea || (code.endsWith('00') && scopedArea.startsWith(code.substring(0, 4)))
  }

  return false
}

function isSubTaskVisibleToScopedRole(task, role, userId, userAreaCode) {
  if (!task || (task.taskType || 'main') !== 'sub') return false
  if (isExplicitReviewer(task, role, userId)) return true
  return getTaskAreaCodes(task).some(code => areaCodeMatchesRoleScope(code, role, userAreaCode))
}

function isTaskVisibleForScopedRole(task, { requestedTaskType, allTasks, role, userId, userAreaCode }) {
  const taskType = task?.taskType || 'main'
  if (taskType === 'sub') return isSubTaskVisibleToScopedRole(task, role, userId, userAreaCode)
  if (requestedTaskType !== 'main') return false

  const childTasks = allTasks.filter(item => Number(item.parentTaskId) === Number(task.id))
  if (childTasks.length) {
    return childTasks.some(item => isSubTaskVisibleToScopedRole(item, role, userId, userAreaCode))
  }

  return getTaskAreaCodes(task)
    .filter(code => code !== '520000')
    .some(code => areaCodeMatchesRoleScope(code, role, userAreaCode))
}
