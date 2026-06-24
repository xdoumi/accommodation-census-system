<template>
  <div class="preview-list">
    <div v-for="group in rows" :key="group.module.key" class="preview-section">
      <div class="preview-title">{{ group.module.key }} {{ group.module.title }}</div>
      <div v-for="{ key, field, value } in group.fields" :key="key" class="preview-row">
        <span class="preview-key">{{ field.label }}：</span>
        <strong>{{ valueText(key, field, value) || '-' }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  COLLECTION_FIELD_MAP,
  COLLECTION_MODULES,
  getOptionLabel,
  getVisibleModuleFields,
  shouldSkipBusinessModule,
} from '@/utils/collectionSpec'

const props = defineProps({
  form: { type: Object, required: true },
})

const rows = computed(() => COLLECTION_MODULES
  .filter(module => !['PREVIEW', 'SIGN'].includes(module.key))
  .map(module => ({
    module,
    fields: (module.key === 'B' && shouldSkipBusinessModule(props.form) ? [] : getVisibleModuleFields(module, props.form))
      .map(key => ({ key, field: COLLECTION_FIELD_MAP[key], value: props.form[key] }))
      .filter(item => item.field),
  }))
  .filter(group => group.fields.length > 0))

function valueText(key, field, value) {
  if (key === 'location') return props.form.location ? (props.form.locationAddress || '当前位置已获取') : ''
  if (field.type === 'photo') return value ? (props.form.businessLicensePhotoName || '已上传图片') : '未上传'
  if (field.type === 'signature') return value ? '已签字' : '未签字'
  if (field.type === 'photos') {
    return Array.isArray(value) && value.length
      ? value.map((photo, index) => photo.name || `现场照片${index + 1}.jpg`).join('、')
      : '未上传'
  }
  if (['select', 'radio', 'checkbox'].includes(field.type)) return getOptionLabel(key, value)
  return value ?? ''
}
</script>

<style lang="scss" scoped>
.preview-section {
  padding: 12px 0;
  border-bottom: 1px solid #eef0f4;
}

.preview-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
}

.preview-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 0;
  font-size: 14px;

  .preview-key {
    color: #000;
    font-weight: 600;
  }

  strong {
    color: #003f88;
    font-weight: 600;
    word-break: break-word;
  }
}
</style>
