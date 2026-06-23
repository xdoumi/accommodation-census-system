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

      // 权限过滤
      const auth = useAuthStore()
      const filtered = allTasks.filter(task => {
        const taskType = task.taskType || 'main'
        if (['enumerator'].includes(auth.userRole)) {
          return taskType === 'sub' && isUserResponsible(task, auth.currentUser?.id)
        }
        if (taskType !== (filters.taskType || 'main')) return false
        if (['super_admin', 'provincial_admin'].includes(auth.userRole)) return true
        const areaCodes = taskType === 'main'
          ? JSON.parse(task.scopeAreaCodes || task.assignedAreaCodes || '[]')
          : JSON.parse(task.assignedAreaCodes || '[]')
        if (auth.userRole === 'city_admin') return areaCodes.some(c => c === auth.userAreaCode)
        if (auth.userRole === 'county_admin') return areaCodes.some(c => c.startsWith(auth.userAreaCode.substring(0, 4)))
        if (['reviewer'].includes(auth.userRole)) return true
        return false
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
          const subTaskIds = subTasks.value.map(t => t.id)
          assignments.value = await fetchAssignmentsByTaskIds(subTaskIds)
        } else {
          subTasks.value = []
          assignments.value = await db.censusAssignments.where('taskId').equals(Number(id)).toArray()
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
      await ensureAssignmentsForSubTask(Number(id))
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
    await ensureAssignmentsForSubTask(id)
    return id
  }

  async function ensureAssignmentsForSubTask(taskId) {
    const task = await db.censusTasks.get(Number(taskId))
    if (!task) return
    const now = new Date().toISOString()
    const areaCodes = JSON.parse(task.assignedAreaCodes || '[]')
    const responsibleUserIds = JSON.parse(task.responsibleUserIds || '[]')
    const assignedTo = responsibleUserIds[0] || null
    for (const areaCode of areaCodes) {
      const existing = await db.censusAssignments.where({ taskId: Number(taskId), areaCode }).first()
      const area = await db.areas.get(areaCode)
      if (!existing) {
        await db.censusAssignments.add({
          taskId: Number(taskId),
          parentTaskId: task.parentTaskId || null,
          areaCode,
          areaName: area?.name || areaCode,
          assignedTo,
          assignedToIds: JSON.stringify(responsibleUserIds),
          assignedToName: task.responsibleUserNames || '',
          status: 'pending',
          progress: 0,
          submittedAt: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewComment: null,
          createdAt: now,
          updatedAt: now,
        })
      } else {
        await db.censusAssignments.update(existing.id, {
          assignedTo,
          assignedToIds: JSON.stringify(responsibleUserIds),
          assignedToName: task.responsibleUserNames || '',
          updatedAt: now,
        })
      }
    }
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
    if (['super_admin', 'provincial_admin'].includes(auth.userRole)) {
      assignments.value = await db.censusAssignments.toArray()
    } else if (['enumerator'].includes(auth.userRole)) {
      const all = await db.censusAssignments.toArray()
      assignments.value = all.filter(a => {
        if (a.assignedTo === uid) return true
        try { return JSON.parse(a.assignedToIds || '[]').includes(uid) } catch { return false }
      })
    } else {
      // 县级/市级/审核员：本辖区
      const all = await db.censusAssignments.toArray()
      assignments.value = all.filter(a => {
        if (auth.userRole === 'county_admin') return a.areaCode === auth.userAreaCode
        if (auth.userRole === 'city_admin') return a.areaCode.startsWith(auth.userAreaCode.substring(0, 4))
        if (auth.userRole === 'reviewer') {
          if (auth.userAreaCode === '520000') return true
          return a.areaCode.startsWith(auth.userAreaCode.substring(0, 4))
        }
        return false
      })
    }
    return assignments.value
  }

  return {
    tasks, currentTask, subTasks, assignments, records, taskLoading, assignmentLoading,
    fetchTasks, fetchTaskDetail, fetchAssignmentsByTaskIds, fetchMyAssignments,
    fetchSubTasks, createTask, createSubTask, updateTask, publishTask, startTask, completeTask, removeTask,
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
