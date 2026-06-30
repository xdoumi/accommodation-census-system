<template>
  <div class="sign-page">
    <div class="m-card sign-hero">
      <div class="hero-kicker">签字确认</div>
      <div class="unit-title">{{ form.operatingName || form.registeredName || form.unitName || '新增采集对象' }}</div>
      <div class="unit-subtitle">签字后才可以提交审核，提交后将进入县级审核流程。</div>
    </div>

    <div class="m-card sign-card">
      <MobileSignaturePad v-model="signature" :error="signatureError" />
    </div>

    <div class="m-bottom-bar">
      <el-button @click="backToPreview">返回预览</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!context || !signature" @click="submitReview">提交审核</el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MobileSignaturePad from '@/components/mobile/MobileSignaturePad.vue'
import db from '@/db'
import { useCensusStore } from '@/stores/census'
import { useOfflineQueue } from '@/composables/useOfflineQueue'
import { createEmptyCollectionForm } from '@/utils/collectionSpec'
import { INITIAL_REVIEW_STATUS } from '@/utils/reviewFlow'
import { clearMobileSubmitContext, loadMobileSubmitContext } from '@/utils/mobileSubmitContext'

const route = useRoute()
const router = useRouter()
const censusStore = useCensusStore()
const offlineQueue = useOfflineQueue()

const context = ref(null)
const signature = ref('')
const signatureError = ref('')
const submitting = ref(false)
const form = computed(() => context.value?.form || createEmptyCollectionForm())

onMounted(() => {
  offlineQueue.start()
  context.value = loadMobileSubmitContext(route.query.ctx)
  signature.value = context.value?.form?.managerSignature || ''
})

function backToPreview() {
  router.push({
    path: `/m/entry/${route.params.taskId}/${route.params.assignmentId || 0}/preview`,
    query: { ctx: route.query.ctx },
  })
}

async function submitReview() {
  if (!context.value) {
    ElMessage.error('未找到待提交数据，请返回重新预览')
    return
  }
  if (!signature.value) {
    signatureError.value = '请完成负责人签字'
    return
  }
  signatureError.value = ''
  submitting.value = true
  try {
    const now = new Date().toISOString()
    const submitForm = {
      ...context.value.form,
      managerSignature: signature.value,
      managerSignatureAt: now,
      submittedAt: now,
    }
    const recordId = await saveRecord(submitForm, now)
    if (context.value.assignmentId) {
      await censusStore.updateAssignment(Number(context.value.assignmentId), {
        status: 'submitted',
        progress: 100,
        submittedAt: now,
      })
    }
    offlineQueue.flush()
    clearMobileSubmitContext(route.query.ctx)
    if (context.value.draftKey) {
      try { localStorage.removeItem(context.value.draftKey) } catch { /* ignore */ }
    }
    ElMessage.success(`提交成功，记录号 ${recordId}`)
    router.push('/m/units')
  } catch (err) {
    ElMessage.error('提交失败：' + (err.message || err))
  } finally {
    submitting.value = false
  }
}

async function saveRecord(submitForm, now) {
  const payload = {
    taskId: Number(context.value.taskId),
    assignmentId: context.value.assignmentId ? Number(context.value.assignmentId) : null,
    accommodationId: context.value.selectedUnitId || null,
    status: INITIAL_REVIEW_STATUS,
    formData: JSON.stringify(submitForm),
    submittedAt: now,
    source: 'mobile',
    unitName: submitForm.operatingName || submitForm.registeredName || submitForm.unitName,
    creditCode: submitForm.creditCode,
    checkType: submitForm.checkType,
    catalogSource: submitForm.catalogSource,
    licenseType: submitForm.licenseType,
    managerSignature: submitForm.managerSignature,
    managerSignatureAt: submitForm.managerSignatureAt,
    location: submitForm.location ? JSON.stringify(submitForm.location) : '',
    reviewLevel: 'county',
    reviewAction: 'submit',
  }
  const existing = await findExistingRecord(submitForm)
  if (context.value.editingRecordId) {
    await censusStore.saveRecord({ id: context.value.editingRecordId, ...payload })
    return context.value.editingRecordId
  }
  if (existing) {
    await censusStore.saveRecord({ id: existing.id, ...payload })
    return existing.id
  }
  return await censusStore.saveRecord(payload)
}

async function findExistingRecord(submitForm) {
  if (context.value.editingRecordId) return db.censusRecords.get(Number(context.value.editingRecordId))
  const assignmentId = context.value.assignmentId ? Number(context.value.assignmentId) : null
  const all = assignmentId
    ? await db.censusRecords.where('assignmentId').equals(assignmentId).toArray()
    : await db.censusRecords.where('taskId').equals(Number(context.value.taskId)).toArray()
  return all.find(record => {
    if (context.value.selectedUnitId && record.accommodationId === context.value.selectedUnitId) return true
    if (submitForm.creditCode && record.creditCode === submitForm.creditCode) return true
    return false
  })
}
</script>

<style lang="scss" scoped>
.sign-page {
  min-height: 100%;
  padding-bottom: 98px;
  background:
    linear-gradient(180deg, #eef5ff 0, #f5f6fa 190px),
    #f5f6fa;
}

.sign-hero {
  margin-top: 10px;
  border: 1px solid rgba(26, 95, 197, 0.1);
  box-shadow: 0 8px 24px rgba(26, 95, 197, 0.08);
}

.hero-kicker {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #1a5fc5;
}

.unit-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.35;
}

.unit-subtitle {
  margin-top: 5px;
  font-size: 13px;
  color: #606266;
}

.sign-card {
  margin-bottom: 86px;
}

:deep(.m-bottom-bar) {
  padding: 12px 14px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  gap: 12px;
  border-top: 1px solid #eef0f4;
  box-shadow: 0 -8px 22px rgba(31, 41, 55, 0.1);
}

:deep(.m-bottom-bar .el-button) {
  height: 48px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
}
</style>
