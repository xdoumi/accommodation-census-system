<template>
  <el-tree
    ref="treeRef"
    :data="areaTree"
    show-checkbox
    node-key="code"
    :default-checked-keys="checkedKeys"
    :props="{ label: 'name', children: 'children' }"
    @check-change="handleCheckChange"
  />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAreaStore } from '@/stores/area'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const treeRef = ref(null)
const areaStore = useAreaStore()

const areaTree = computed(() => {
  // 只取市级节点（下面含区县子节点）
  return areaStore.areaTree.flatMap(prov => prov.children || [])
})

const checkedKeys = computed(() => props.modelValue)

onMounted(async () => {
  await areaStore.fetchAreas()
  // 设置初始选中
  if (props.modelValue.length > 0 && treeRef.value) {
    treeRef.value.setCheckedKeys(props.modelValue)
  }
})

function handleCheckChange() {
  const checked = treeRef.value?.getCheckedKeys() || []
  emit('update:modelValue', checked)
}
</script>
