<template>
  <el-tag :color="bgColor" :style="{ color: textColor, border: 'none' }" size="small" effect="dark">
    {{ label }}
  </el-tag>
</template>

<script setup>
import { computed } from 'vue'
import { CATEGORY_OPTIONS } from '@/utils/constants'

const props = defineProps({
  value: { type: String, required: true },
})

const option = computed(() => CATEGORY_OPTIONS.find(c => c.value === props.value))

const label = computed(() => option.value?.label || props.value)
const bgColor = computed(() => option.value?.color || '#909399')
const textColor = computed(() => '#fff')
</script>
