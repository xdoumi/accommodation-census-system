import db from '@/db'
import { useAuthStore } from '@/stores/auth'
import {
  COLLECTION_FIELD_MAP,
  COLLECTION_MODULES,
  buildCollectionFormFromUnit,
  extractAccommodationPatch,
  getOptionLabel,
  getVisibleModuleFields,
  shouldSkipBusinessModule,
} from '@/utils/collectionSpec'

export function parseRecordFormData(record = {}) {
  if (!record?.formData) return {}
  try { return JSON.parse(record.formData) } catch { return {} }
}

export function buildDisplayName(row = {}, formData = {}) {
  return formData.operatingName || formData.registeredName || formData.unitName || row.unitName || row.name || '未命名单位'
}

export function buildDisplayAddress(row = {}, formData = {}) {
  return formData.actualAddress || formData.registeredAddress || formData.locationAddress || row.actualAddress || row.detailAddress || '-'
}

export function formatCollectionValue(key, field, value, form = {}) {
  if (!field) return value
  if (key === 'location' && value) return form.locationAddress || '已采集定位，经纬度已存储'
  if (field.type === 'photo') return value ? (form.businessLicensePhotoName || '已上传图片') : ''
  if (field.type === 'signature') return value ? '已签字' : ''
  if (field.type === 'photos') {
    return Array.isArray(value) && value.length
      ? value.map((photo, index) => photo.name || `现场照片${index + 1}.jpg`).join('、')
      : ''
  }
  if (['select', 'radio', 'checkbox', 'industry'].includes(field.type)) return getOptionLabel(key, value)
  if (Array.isArray(value)) return value.join('、')
  return value ?? ''
}

export function getFullCollectionExportColumns(areaName = code => code) {
  const baseColumns = [
    { key: 'displayName', title: '单位名称', width: 24 },
    { key: 'displayDataUpdatedAt', title: '数据更新日期', width: 20 },
  ]
  const fieldColumns = COLLECTION_MODULES
    .filter(module => module.key !== 'PREVIEW')
    .flatMap(module => module.fields.map(key => ({
      key: `form.${key}`,
      title: `${module.title} - ${COLLECTION_FIELD_MAP[key]?.label || key}`,
      width: 24,
      formatter: (_, row) => {
        const form = row._formData || buildCollectionFormFromUnit(row)
        const field = COLLECTION_FIELD_MAP[key]
        return formatCollectionValue(key, field, form[key], form)
      },
    })))
  return [...baseColumns, ...fieldColumns]
}

export async function publishRecordToAccommodation(record) {
  const formData = parseRecordFormData(record)
  const patch = extractAccommodationPatch(formData)
  const now = new Date().toISOString()
  const normalizedPatch = {
    ...patch,
    creditCode: patch.creditCode || undefined,
    dataUpdatedAt: record.provinceReviewedAt || record.reviewedAt || now,
    updatedAt: now,
  }

  if (record.accommodationId) {
    const existing = await db.accommodations.get(Number(record.accommodationId))
    if (existing) {
      await db.accommodations.update(record.accommodationId, normalizedPatch)
      return record.accommodationId
    }
  }

  const existingByCreditCode = normalizedPatch.creditCode
    ? await db.accommodations.where('creditCode').equals(normalizedPatch.creditCode).first()
    : null
  if (existingByCreditCode) {
    await db.accommodations.update(existingByCreditCode.id, normalizedPatch)
    await db.censusRecords.update(record.id, { accommodationId: existingByCreditCode.id })
    record.accommodationId = existingByCreditCode.id
    return existingByCreditCode.id
  }

  const id = await db.accommodations.add({
    ...normalizedPatch,
    createdAt: now,
    updatedAt: now,
  })
  await db.censusRecords.update(record.id, { accommodationId: id })
  record.accommodationId = id
  return id
}

export async function archiveAccommodation(id, reason = '单位列表删除') {
  const item = await db.accommodations.get(Number(id))
  if (!item) return
  await archiveDeletedItem('accommodation', item.id, item, buildDisplayName(item), reason)
  await db.accommodations.delete(Number(id))
}

export async function archiveCensusRecord(id, reason = '审核/填报记录删除') {
  const item = await db.censusRecords.get(Number(id))
  if (!item) return
  const formData = parseRecordFormData(item)
  await archiveDeletedItem('censusRecord', item.id, item, buildDisplayName(item, formData), reason)
  await db.censusRecords.delete(Number(id))
}

export async function archiveDeletedItem(type, sourceId, data, name, reason) {
  const auth = useAuthStore()
  await db.deletedItems.add({
    type,
    sourceId,
    name,
    reason,
    data: JSON.stringify(data || {}),
    deletedBy: auth.currentUser?.id || null,
    deletedByName: auth.currentUser?.realName || '',
    deletedAt: new Date().toISOString(),
  })
}

export async function restoreDeletedItem(item) {
  if (!item) return
  const data = JSON.parse(item.data || '{}')
  const now = new Date().toISOString()
  if (item.type === 'accommodation') {
    await db.accommodations.put({ ...data, restoredAt: now, updatedAt: now })
  } else if (item.type === 'censusRecord') {
    await db.censusRecords.put({ ...data, restoredAt: now, updatedAt: now })
  }
  await db.deletedItems.delete(Number(item.id))
}

export function visibleCollectionFieldsForForm(form = {}) {
  return COLLECTION_MODULES
    .filter(module => module.key !== 'PREVIEW')
    .flatMap(module => (module.key === 'B' && shouldSkipBusinessModule(form) ? [] : getVisibleModuleFields(module, form)))
}
