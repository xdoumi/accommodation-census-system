<template>
  <el-popover
    v-model:visible="visible"
    placement="bottom-start"
    trigger="click"
    width="380"
    popper-class="area-multi-popper"
  >
    <template #reference>
      <button type="button" class="area-trigger" :disabled="disabled">
        <span :class="{ placeholder: !selectedCodes.length }">{{ displayText }}</span>
        <el-icon><ArrowDown /></el-icon>
      </button>
    </template>

    <div class="area-panel">
      <div class="area-actions">
        <el-button size="small" type="primary" plain @click="selectProvince">全选贵州省</el-button>
        <el-button size="small" @click="clearSelection">清空</el-button>
      </div>
      <el-tree
        ref="treeRef"
        :data="treeData"
        node-key="code"
        show-checkbox
        default-expand-all
        :props="{ label: 'name', children: 'children' }"
        :check-strictly="false"
        :default-checked-keys="selectedCodes"
        @check="handleCheck"
      />
    </div>
  </el-popover>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { useAreaStore } from '@/stores/area'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])
const areaStore = useAreaStore()
const visible = ref(false)
const treeRef = ref(null)
const selectedCodes = ref([])

const treeData = computed(() => areaStore.areaTree)
const cityCodes = computed(() => areaStore.areas.filter(area => area.level === 2).map(area => area.code))
const countyCodes = computed(() => areaStore.areas.filter(area => area.level === 3).map(area => area.code))
const allSelectableCodes = computed(() => ['520000', ...cityCodes.value, ...countyCodes.value])

const displayText = computed(() => {
  if (!selectedCodes.value.length || selectedCodes.value.includes('520000')) return '贵州省（全部）'
  const selectedCities = selectedCodes.value.filter(code => areaStore.getAreaByCode(code)?.level === 2)
  const selectedCounties = selectedCodes.value.filter(code => areaStore.getAreaByCode(code)?.level === 3)
  if (selectedCities.length === 1 && selectedCounties.length === areaStore.getCountiesByCity(selectedCities[0]).length) {
    return `${areaStore.getAreaName(selectedCities[0])}（全部区县）`
  }
  const firstNames = selectedCodes.value
    .filter(code => code !== '520000')
    .slice(0, 2)
    .map(code => areaStore.getAreaName(code))
  return `${firstNames.join('、')}${selectedCodes.value.length > 2 ? ` 等${selectedCodes.value.length}项` : ''}`
})

onMounted(async () => {
  await areaStore.fetchAreas()
  syncFromModel()
})

watch(() => props.modelValue, syncFromModel, { deep: true })

function syncFromModel() {
  selectedCodes.value = expandSelection(Array.isArray(props.modelValue) ? props.modelValue : [])
  nextTick(() => treeRef.value?.setCheckedKeys(selectedCodes.value))
}

function handleCheck() {
  const keys = treeRef.value?.getCheckedKeys(false) || []
  selectedCodes.value = normalizeCodes(keys)
  emit('update:modelValue', selectedCodes.value)
  emit('change', selectedCodes.value)
}

function selectProvince() {
  selectedCodes.value = [...allSelectableCodes.value]
  treeRef.value?.setCheckedKeys(selectedCodes.value)
  emit('update:modelValue', selectedCodes.value)
  emit('change', selectedCodes.value)
}

function clearSelection() {
  selectedCodes.value = []
  treeRef.value?.setCheckedKeys([])
  emit('update:modelValue', [])
  emit('change', [])
}

function normalizeCodes(keys = []) {
  const set = new Set(keys)
  return allSelectableCodes.value.filter(code => set.has(code))
}

function expandSelection(codes = []) {
  const set = new Set(codes)
  if (!set.size || set.has('520000')) return [...allSelectableCodes.value]

  for (const code of [...set]) {
    const area = areaStore.getAreaByCode(code)
    if (area?.level === 2) {
      set.add(code)
      areaStore.getCountiesByCity(code).forEach(item => set.add(item.code))
    }
  }

  return allSelectableCodes.value.filter(code => set.has(code))
}
</script>

<style lang="scss" scoped>
.area-trigger {
  width: 300px;
  min-height: 32px;
  padding: 0 10px 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .placeholder {
    color: #606266;
  }

  &:disabled {
    cursor: not-allowed;
    background: #f5f7fa;
  }
}

.area-panel {
  max-height: 420px;
  overflow: auto;
}

.area-actions {
  position: sticky;
  top: 0;
  z-index: 1;
  padding-bottom: 8px;
  background: #fff;
  display: flex;
  gap: 8px;
}
</style>
