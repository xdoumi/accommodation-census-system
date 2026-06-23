<template>
  <div class="page-container">
    <el-page-header @back="router.push('/accommodation')" :title="'返回列表'">
      <template #content>
        <span class="page-title">{{ isEdit ? '编辑住宿单位' : '新增住宿单位' }}</span>
      </template>
    </el-page-header>

    <el-form ref="formRef" :model="form" label-width="190px" style="margin-top: 16px;">
      <el-card
        v-for="module in modules"
        :key="module.key"
        shadow="never"
        class="module-card"
      >
        <template #header>
          <span>{{ module.title }}</span>
        </template>
        <el-row :gutter="16">
          <el-col v-for="key in visibleFields(module)" :key="key" :span="fieldSpan(key)">
            <el-form-item :label="fieldLabel(key)">
              <component
                :is="fieldComponent(key)"
                v-model="form[key]"
                :field="FIELD_MAP[key]"
                :form="form"
                @industry-change="syncIndustryCode"
                @ota-change="handleOtaChange"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <div style="margin-top: 20px; text-align: center;">
        <el-button @click="router.push('/accommodation')">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '提交' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
} from 'element-plus'
import { useAccommodationStore } from '@/stores/accommodation'
import {
  COLLECTION_FIELD_MAP as FIELD_MAP,
  COLLECTION_MODULES,
  INDUSTRY_OPTIONS,
  buildCollectionFormFromUnit,
  createEmptyCollectionForm,
  extractAccommodationPatch,
  getVisibleModuleFields,
  shouldSkipBusinessModule,
} from '@/utils/collectionSpec'

const route = useRoute()
const router = useRouter()
const store = useAccommodationStore()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const submitting = ref(false)
const form = reactive(createEmptyCollectionForm())
const sourceDetail = ref(null)
const modules = computed(() => COLLECTION_MODULES.filter(module => module.key !== 'PREVIEW' && visibleFields(module).length > 0))

function visibleFields(module) {
  if (module.key === 'B' && shouldSkipBusinessModule(form)) return []
  return getVisibleModuleFields(module, form)
}

onMounted(async () => {
  if (isEdit.value) {
    const detail = await store.fetchDetail(route.params.id)
    sourceDetail.value = detail
    if (detail) Object.assign(form, buildCollectionFormFromUnit(detail))
  }
})

function fieldLabel(key) {
  const field = FIELD_MAP[key]
  return field ? field.label : key
}

function fieldSpan(key) {
  const type = FIELD_MAP[key]?.type
  return ['textarea', 'checkbox', 'photos', 'photo', 'signature', 'location'].includes(type) ? 24 : 12
}

function fieldComponent(key) {
  const type = FIELD_MAP[key]?.type
  if (type === 'select') return SelectControl
  if (type === 'radio') return RadioControl
  if (type === 'checkbox') return CheckboxControl
  if (type === 'industry') return IndustryControl
  if (type === 'textarea') return TextareaControl
  if (type === 'integer') return NumberControl
  if (type === 'date') return DateControl
  if (type === 'location') return LocationControl
  if (['photo', 'photos', 'signature'].includes(type)) return AssetPlaceholder
  return TextControl
}

function syncIndustryCode(value) {
  form.economyIndustryCode = value
}

function handleOtaChange(value) {
  if (value.includes('none') && value.length > 1) form.otaPlatforms = ['none']
}

async function handleSubmit() {
  submitting.value = true
  try {
    const patch = {
      ...(sourceDetail.value || {}),
      ...extractAccommodationPatch(form),
      registeredName: form.registeredName,
      registeredAddress: form.registeredAddress,
      registeredDivisionCode: form.registeredDivisionCode,
      registrationDate: form.registrationDate,
      operatingName: form.operatingName,
      actualAddress: form.actualAddress,
      divisionCode: form.divisionCode,
      economyIndustryCode: form.economyIndustryCode,
      stateHolding: form.stateHolding,
      buildingOwnership: form.buildingOwnership,
      businessMode: form.businessMode,
      businessModeRemark: form.businessModeRemark,
      ratingLevel: form.ratingLevel,
      policeSystemStatus: form.policeSystemStatus,
      policeSystemReason: form.policeSystemReason,
      inOriginalCultureTourismList: form.inOriginalCultureTourismList,
      otaPlatforms: JSON.stringify(form.otaPlatforms || []),
      otaOther: form.otaOther,
    }
    if (isEdit.value) {
      await store.update(route.params.id, patch)
      ElMessage.success('修改成功')
    } else {
      await store.create(patch)
      ElMessage.success('新增成功')
    }
    router.push('/accommodation')
  } finally {
    submitting.value = false
  }
}

const TextControl = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElInput, { modelValue: props.modelValue, 'onUpdate:modelValue': v => emit('update:modelValue', v) })
  },
})

const TextareaControl = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElInput, { type: 'textarea', rows: 3, modelValue: props.modelValue, 'onUpdate:modelValue': v => emit('update:modelValue', v) })
  },
})

const NumberControl = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElInputNumber, { modelValue: props.modelValue, min: 0, style: 'width: 100%', 'onUpdate:modelValue': v => emit('update:modelValue', v) })
  },
})

const DateControl = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElDatePicker, { modelValue: props.modelValue, type: 'date', valueFormat: 'YYYY-MM-DD', style: 'width: 100%', 'onUpdate:modelValue': v => emit('update:modelValue', v) })
  },
})

const SelectControl = defineComponent({
  props: ['modelValue', 'field'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElSelect, { modelValue: props.modelValue, clearable: true, style: 'width: 100%', 'onUpdate:modelValue': v => emit('update:modelValue', v) }, () =>
      (props.field.options || []).map(opt => h(ElOption, { label: opt.label, value: opt.value })),
    )
  },
})

const RadioControl = defineComponent({
  props: ['modelValue', 'field'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h(ElRadioGroup, { modelValue: props.modelValue, 'onUpdate:modelValue': v => emit('update:modelValue', v) }, () =>
      (props.field.options || []).map(opt => h(ElRadio, { label: opt.value }, () => opt.label)),
    )
  },
})

const CheckboxControl = defineComponent({
  props: ['modelValue', 'field'],
  emits: ['update:modelValue', 'ota-change'],
  setup(props, { emit }) {
    return () => h(ElCheckboxGroup, {
      modelValue: props.modelValue || [],
      'onUpdate:modelValue': v => { emit('update:modelValue', v); emit('ota-change', v) },
    }, () => (props.field.options || []).map(opt => h(ElCheckbox, { label: opt.value }, () => opt.label)))
  },
})

const IndustryControl = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue', 'industry-change'],
  setup(props, { emit }) {
    return () => h(ElSelect, {
      modelValue: props.modelValue,
      filterable: true,
      clearable: true,
      style: 'width: 100%',
      'onUpdate:modelValue': v => { emit('update:modelValue', v); emit('industry-change', v) },
    }, () => INDUSTRY_OPTIONS.map(opt => h(ElOption, { label: opt.label, value: opt.value })))
  },
})

const LocationControl = defineComponent({
  props: ['modelValue', 'form'],
  setup(props) {
    return () => h('span', null, props.modelValue ? (props.form.locationAddress || '已采集定位，经纬度已存储') : '未采集定位')
  },
})

const AssetPlaceholder = defineComponent({
  props: ['modelValue', 'field', 'form'],
  setup(props) {
    return () => {
      if (props.field.type === 'photo') return h('span', null, props.modelValue ? (props.form.businessLicensePhotoName || '已上传图片') : '未上传')
      if (props.field.type === 'photos') return h('span', null, Array.isArray(props.modelValue) && props.modelValue.length ? props.modelValue.map((photo, index) => photo.name || `现场照片${index + 1}.jpg`).join('、') : '未上传')
      return h('span', null, props.modelValue ? '已签字' : '未签字')
    }
  },
})
</script>

<style scoped>
.module-card {
  margin-bottom: 16px;
}
</style>
