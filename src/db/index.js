import Dexie from 'dexie'

const db = new Dexie('AccommodationCensusDB')

db.version(1).stores({
  users: '++id, &username, role, areaCode, status',
  accommodations: '++id, &creditCode, category, cityCode, countyCode, operatingStatus, starRating',
  censusTasks: '++id, status, deadline',
  censusAssignments: '++id, taskId, areaCode, assignedTo, status',
  censusRecords: '++id, taskId, assignmentId, accommodationId, status, filledBy',
  areas: '&code, level, parentCode',
  operationLogs: '++id, userId, module, action, createdAt'
})

// v2: 添加 AI 聊天历史表
db.version(2).stores({
  users: '++id, &username, role, areaCode, status',
  accommodations: '++id, &creditCode, category, cityCode, countyCode, operatingStatus, starRating',
  censusTasks: '++id, status, deadline',
  censusAssignments: '++id, taskId, areaCode, assignedTo, status',
  censusRecords: '++id, taskId, assignmentId, accommodationId, status, filledBy',
  areas: '&code, level, parentCode',
  operationLogs: '++id, userId, module, action, createdAt',
  aiChatSessions: '++id, &sessionId, userId, createdAt',
  aiChatMessages: '++id, sessionId, role, createdAt',
})

// v3: 主任务/子任务结构，增加任务类型和父任务索引；分配支持多责任人查询
db.version(3).stores({
  users: '++id, &username, role, areaCode, status',
  accommodations: '++id, &creditCode, category, cityCode, countyCode, operatingStatus, starRating',
  censusTasks: '++id, taskType, parentTaskId, status, deadline',
  censusAssignments: '++id, taskId, areaCode, assignedTo, status',
  censusRecords: '++id, taskId, assignmentId, accommodationId, status, filledBy',
  areas: '&code, level, parentCode',
  operationLogs: '++id, userId, module, action, createdAt',
  aiChatSessions: '++id, &sessionId, userId, createdAt',
  aiChatMessages: '++id, sessionId, role, createdAt',
})

// v4: 软删除归档、任务开始日期和任务单位分派辅助字段
db.version(4).stores({
  users: '++id, &username, role, areaCode, status',
  accommodations: '++id, &creditCode, category, cityCode, countyCode, operatingStatus, starRating',
  censusTasks: '++id, taskType, parentTaskId, status, startDate, deadline',
  censusAssignments: '++id, taskId, areaCode, assignedTo, status',
  censusRecords: '++id, taskId, assignmentId, accommodationId, status, filledBy',
  areas: '&code, level, parentCode',
  operationLogs: '++id, userId, module, action, createdAt',
  aiChatSessions: '++id, &sessionId, userId, createdAt',
  aiChatMessages: '++id, sessionId, role, createdAt',
  deletedItems: '++id, type, sourceId, deletedAt',
})

export default db
