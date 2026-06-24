export const INITIAL_REVIEW_STATUS = 'pending_county_review'
export const FINAL_AVAILABLE_STATUS = 'available'

export const REVIEW_STEP_BY_ROLE = {
  county_admin: {
    level: 'county',
    pending: ['pending_county_review', 'city_rejected'],
    approveTo: 'pending_city_review',
    rejectTo: 'county_rejected',
    approveText: '提交市级审核',
    rejectText: '驳回普查员',
    approvedField: 'countyReviewedAt',
    approvedByField: 'countyReviewedBy',
    rejectedField: 'countyRejectedAt',
    rejectedByField: 'countyRejectedBy',
  },
  city_admin: {
    level: 'city',
    pending: ['pending_city_review', 'province_rejected'],
    approveTo: 'pending_province_review',
    rejectTo: 'city_rejected',
    approveText: '提交省级审核',
    rejectText: '驳回县级',
    approvedField: 'cityReviewedAt',
    approvedByField: 'cityReviewedBy',
    rejectedField: 'cityRejectedAt',
    rejectedByField: 'cityRejectedBy',
  },
  provincial_admin: {
    level: 'province',
    pending: ['pending_province_review'],
    approveTo: FINAL_AVAILABLE_STATUS,
    rejectTo: 'province_rejected',
    approveText: '审核通过',
    rejectText: '驳回市级',
    approvedField: 'provinceReviewedAt',
    approvedByField: 'provinceReviewedBy',
    rejectedField: 'provinceRejectedAt',
    rejectedByField: 'provinceRejectedBy',
  },
  super_admin: {
    level: 'province',
    pending: ['pending_province_review'],
    approveTo: FINAL_AVAILABLE_STATUS,
    rejectTo: 'province_rejected',
    approveText: '审核通过',
    rejectText: '驳回市级',
    approvedField: 'provinceReviewedAt',
    approvedByField: 'provinceReviewedBy',
    rejectedField: 'provinceRejectedAt',
    rejectedByField: 'provinceRejectedBy',
  },
}

export function normalizeRecordStatus(status) {
  if (status === 'submitted') return INITIAL_REVIEW_STATUS
  if (status === 'approved') return FINAL_AVAILABLE_STATUS
  if (status === 'rejected') return 'county_rejected'
  return status || 'draft'
}

export function getReviewStepForRole(role) {
  return REVIEW_STEP_BY_ROLE[role] || null
}

export function canReviewRecord(record, role) {
  const step = getReviewStepForRole(role)
  if (!step || !record) return false
  return step.pending.includes(normalizeRecordStatus(record.status))
}

function parseIdArray(raw) {
  try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
}

export function isReviewerInScope(assignment, role, userId, userAreaCode) {
  if (['super_admin', 'provincial_admin'].includes(role)) return true
  if (!assignment) return false

  const areaCode = String(assignment.areaCode || '')
  if (role === 'county_admin') {
    if (parseIdArray(assignment.countyAdminIds).includes(userId)) return true
    return areaCode === userAreaCode
  }

  if (role === 'city_admin') {
    if (parseIdArray(assignment.cityAdminIds).includes(userId)) return true
    return areaCode.startsWith(String(userAreaCode || '').substring(0, 4))
  }

  return false
}

export function buildReviewPatch(record, role, action, userId) {
  const step = getReviewStepForRole(role)
  if (!step) throw new Error('当前角色无审核权限')
  const currentStatus = normalizeRecordStatus(record.status)
  if (!step.pending.includes(currentStatus)) throw new Error('当前记录不在本级待审状态')

  const now = new Date().toISOString()
  if (action === 'approve') {
    return {
      status: step.approveTo,
      reviewLevel: step.level,
      reviewAction: 'approve',
      reviewedBy: userId,
      reviewedAt: now,
      [step.approvedByField]: userId,
      [step.approvedField]: now,
      updatedAt: now,
    }
  }

  return {
    status: step.rejectTo,
    reviewLevel: step.level,
    reviewAction: 'reject',
    reviewedBy: userId,
    reviewedAt: now,
    [step.rejectedByField]: userId,
    [step.rejectedField]: now,
    updatedAt: now,
  }
}

export function submitForCountyReviewPatch() {
  const now = new Date().toISOString()
  return {
    status: INITIAL_REVIEW_STATUS,
    submittedAt: now,
    updatedAt: now,
    reviewLevel: 'county',
    reviewAction: 'submit',
  }
}
