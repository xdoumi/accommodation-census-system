<template>
  <el-steps :active="activeStep" align-center finish-status="success">
    <el-step title="草稿" description="任务编制中" />
    <el-step title="进行中" description="数据填报中" />
    <el-step title="已完成" description="全部审核通过" />
  </el-steps>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
})

const statusMap = { draft: 0, in_progress: 1, completed: 2 }
const activeStep = computed(() => statusMap[props.status] ?? 0)
</script>
