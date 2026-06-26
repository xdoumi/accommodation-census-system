import { normalizeRecordStatus } from '@/utils/reviewFlow'

export function parseJsonArray(raw) {
  try {
    return Array.isArray(raw) ? raw : JSON.parse(raw || '[]')
  } catch {
    return []
  }
}

export function parseJsonObject(raw) {
  try {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw
    const parsed = JSON.parse(raw || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function allocatedSpotCount(assignment = {}) {
  const explicit = Number(assignment.allocatedSpotCheckCount)
  if (Number.isFinite(explicit) && explicit >= 0) return explicit
  return Number(assignment.spotCheckCount || 0)
}

export function allocatedImportedCount(assignment = {}) {
  return Number(assignment.importedCheckCount || assignment.allocatedImportedCheckCount || 0)
}

export function getRecordCheckType(record = {}) {
  if (record.checkType) return record.checkType
  try { return JSON.parse(record.formData || '{}').checkType || '' } catch { return '' }
}

export function isCountyPending(status) {
  return normalizeRecordStatus(status) === 'pending_county_review'
}

export function hasEnteredCityReview(status) {
  return ['pending_city_review', 'pending_province_review', 'city_rejected', 'province_rejected', 'available'].includes(normalizeRecordStatus(status))
}

export function isReviewFinished(status) {
  return normalizeRecordStatus(status) === 'available'
}

export function buildAssignmentStats(assignments = []) {
  return assignments.reduce((acc, assignment) => {
    acc.unitCount += Number(assignment.unitCount || 0)
    acc.allocatedSpot += allocatedSpotCount(assignment)
    acc.allocatedImported += allocatedImportedCount(assignment)
    return acc
  }, { unitCount: 0, allocatedSpot: 0, allocatedImported: 0 })
}

export function buildRecordStats(records = []) {
  return records.reduce((acc, record) => {
    const status = normalizeRecordStatus(record.status)
    const type = getRecordCheckType(record)
    if (isCountyPending(status)) {
      if (type === 'catalog_spot_check') acc.spotCountyPending += 1
      if (type === 'imported_catalog') acc.importedCountyPending += 1
    }
    if (hasEnteredCityReview(status)) {
      if (type === 'catalog_spot_check') acc.actualSpot += 1
      if (type === 'imported_catalog') acc.actualImported += 1
    }
    if (isReviewFinished(status)) {
      if (type === 'catalog_spot_check') acc.finishedSpot += 1
      if (type === 'imported_catalog') acc.finishedImported += 1
    }
    return acc
  }, {
    spotCountyPending: 0,
    importedCountyPending: 0,
    actualSpot: 0,
    actualImported: 0,
    finishedSpot: 0,
    finishedImported: 0,
  })
}

export function sumCountyQuota(quotaMap = {}, countyCodes = []) {
  return countyCodes.reduce((sum, code) => {
    const value = Number(quotaMap[String(code)] ?? 0)
    return sum + (Number.isInteger(value) && value >= 0 ? value : 0)
  }, 0)
}
