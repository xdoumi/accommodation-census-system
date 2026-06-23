<template>
  <el-cascader
    v-model="selectedCodes"
    :options="options"
    :props="cascaderProps"
    :placeholder="placeholder"
    :disabled="disabled"
    clearable
    filterable
    @change="handleChange"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAreaStore } from '@/stores/area'

const props = defineProps({
  modelValue: { type: String, default: '' },
  level: { type: Number, default: 3 },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '请选择区域' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const areaStore = useAreaStore()
const selectedCodes = ref([])

const cascaderProps = {
  value: 'code',
  label: 'name',
  children: 'children',
  checkStrictly: true,
}

const options = computed(() => {
  let tree = areaStore.areaTree
  if (props.level === 1) {
    tree = areaStore.provinceList
  } else if (props.level === 2) {
    tree = areaStore.areaTree.map(p => ({ ...p, children: undefined }))
  }
  return tree
})

onMounted(async () => {
  await areaStore.fetchAreas()
  initValue()
})

watch(() => props.modelValue, () => {
  initValue()
})

function initValue() {
  if (!props.modelValue) {
    selectedCodes.value = []
    return
  }
  // 根据区域代码构建级联路径
  const codes = []
  const code = props.modelValue
  const area = areaStore.getAreaByCode(code)
  if (area) {
    if (area.parentCode) {
      const parent = areaStore.getAreaByCode(area.parentCode)
      if (parent?.parentCode) {
        codes.unshift(parent.parentCode)
      }
      codes.unshift(area.parentCode)
    }
    codes.push(code)
  }
  selectedCodes.value = codes
}

function handleChange(val) {
  const code = val && val.length > 0 ? val[val.length - 1] : ''
  emit('update:modelValue', code)
  emit('change', code)
}
</script>
