<template>
  <el-tag v-if="tagType" :type="tagType" size="small">{{ label }}</el-tag>
  <el-tag v-else size="small">{{ label }}</el-tag>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: String, default: '' },
  options: { type: Array, required: true },
})

const option = computed(() => props.options.find(o => o.value === props.value))

const label = computed(() => option.value?.label || props.value || '-')
const tagType = computed(() => option.value?.type || '')
</script>
