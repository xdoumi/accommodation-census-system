<template>
  <div class="page-container" v-loading="loading">
    <el-page-header @back="router.push('/accommodation')" :title="'返回列表'">
      <template #content>
        <span class="page-title">{{ detail?.name || '住宿单位详情' }}</span>
        <CategoryTag v-if="detail?.category" :value="detail.category" style="margin-left: 8px" />
      </template>
    </el-page-header>

    <div v-if="detail" style="margin-top: 20px;">
      <el-card shadow="never" class="module-card">
        <template #header>
          <span>基础信息</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="单位名称">{{ detail.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="数据更新日期">{{ formatDateTime(detail.dataUpdatedAt || detail.updatedAt) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="市州">{{ areaStore.getAreaName(detail.cityCode) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="区县">{{ areaStore.getAreaName(detail.countyCode) || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card
        v-for="module in modules"
        :key="module.key"
        shadow="never"
        class="module-card"
      >
        <template #header>
          <span>{{ module.title }}</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item
            v-for="key in visibleFields(module)"
            :key="key"
            :label="fieldLabel(key)"
            :span="fieldSpan(key)"
          >
            <img v-if="isSignatureField(key) && form[key]" class="signature-image" :src="form[key]" alt="住宿单位负责人签字" />
            <span v-else>{{ formatValue(key) || '-' }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccommodationStore } from '@/stores/accommodation'
import { useAreaStore } from '@/stores/area'
import CategoryTag from '@/components/common/CategoryTag.vue'
import { formatDateTime } from '@/utils/formatters'
import {
  COLLECTION_FIELD_MAP,
  COLLECTION_MODULES,
  buildCollectionFormFromUnit,
  getVisibleModuleFields,
  getOptionLabel,
  shouldSkipBusinessModule,
} from '@/utils/collectionSpec'

const route = useRoute()
const router = useRouter()
const store = useAccommodationStore()
const areaStore = useAreaStore()

const detail = ref(null)
const loading = ref(true)
const form = ref({})

const modules = computed(() => COLLECTION_MODULES.filter(module => module.key !== 'PREVIEW' && visibleFields(module).length > 0))

function visibleFields(module) {
  if (module.key === 'B' && shouldSkipBusinessModule(form.value)) return []
  return getVisibleModuleFields(module, form.value)
}

onMounted(async () => {
  await areaStore.fetchAreas()
  detail.value = await store.fetchDetail(route.params.id)
  form.value = buildCollectionFormFromUnit(detail.value || {})
  loading.value = false
})

function fieldLabel(key) {
  const field = COLLECTION_FIELD_MAP[key]
  return field ? field.label : key
}

function fieldSpan(key) {
  const type = COLLECTION_FIELD_MAP[key]?.type
  return ['textarea', 'photo', 'photos', 'signature', 'location', 'checkbox', 'divisionAddress'].includes(type) ? 2 : 1
}

function isSignatureField(key) {
  return COLLECTION_FIELD_MAP[key]?.type === 'signature'
}

function formatValue(key) {
  const field = COLLECTION_FIELD_MAP[key]
  const value = form.value[key]
  if (!field) return value
  if (key === 'location') {
    return form.value.location ? (form.value.locationAddress || '已采集定位，经纬度已存储') : ''
  }
  if (field.type === 'photo') {
    return value ? (form.value.businessLicensePhotoName || '已上传图片') : ''
  }
  if (field.type === 'photos') {
    return Array.isArray(value) && value.length
      ? value.map((photo, index) => photo.name || `现场照片${index + 1}.jpg`).join('、')
      : ''
  }
  if (field.type === 'signature') return value ? '已签字' : ''
  if (['select', 'radio', 'checkbox', 'industry'].includes(field.type)) return getOptionLabel(key, value)
  if (Array.isArray(value)) return value.join('、')
  return value
}
</script>

<style scoped>
.module-card {
  margin-bottom: 16px;
}

.signature-image {
  display: block;
  max-width: 360px;
  width: 100%;
  max-height: 120px;
  object-fit: contain;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}
</style>
