<template>
  <div class="preview-page">
    <div class="m-card preview-hero">
      <div class="hero-kicker">提交预览</div>
      <div class="unit-title">{{ form.operatingName || form.registeredName || form.unitName || '新增采集对象' }}</div>
      <div class="unit-subtitle">请核对整张采集表，确认无误后进入签字确认。</div>
    </div>

    <div class="m-card preview-card">
      <CollectionSubmitPreview v-if="context" :form="form" />
      <el-empty v-else description="未找到待预览的填报数据" />
    </div>

    <div class="m-bottom-bar">
      <el-button @click="backToEdit">返回编辑</el-button>
      <el-button type="primary" :disabled="!context" @click="goSign">签字确认</el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CollectionSubmitPreview from '@/components/mobile/CollectionSubmitPreview.vue'
import { createEmptyCollectionForm } from '@/utils/collectionSpec'
import { loadMobileSubmitContext } from '@/utils/mobileSubmitContext'

const route = useRoute()
const router = useRouter()
const context = ref(null)
const form = computed(() => context.value?.form || createEmptyCollectionForm())

onMounted(() => {
  context.value = loadMobileSubmitContext(route.query.ctx)
})

function backToEdit() {
  const taskId = route.params.taskId
  const assignmentId = route.params.assignmentId || 0
  const query = {}
  if (context.value?.editingRecordId) query.recordId = context.value.editingRecordId
  router.push({ path: `/m/entry/${taskId}/${assignmentId}`, query })
}

function goSign() {
  router.push({
    path: `/m/entry/${route.params.taskId}/${route.params.assignmentId || 0}/sign`,
    query: { ctx: route.query.ctx },
  })
}
</script>

<style lang="scss" scoped>
.preview-page {
  min-height: 100%;
  padding-bottom: 98px;
  background:
    linear-gradient(180deg, #eef5ff 0, #f5f6fa 190px),
    #f5f6fa;
}

.preview-hero {
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

.preview-card {
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
