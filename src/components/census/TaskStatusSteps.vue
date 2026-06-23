<template>
  <el-steps :active="activeStep" align-center finish-status="success">
    <el-step title="草稿" description="任务编制中" />
    <el-step title="已发布" description="任务已下发" />
    <el-step title="进行中" description="数据填报中" />
    <el-step title="已完成" description="全部审核通过" />
  </el-steps>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
})

const statusMap = { draft: 0, published: 1, in_progress: 2, completed: 3 }
const activeStep = computed(() => statusMap[props.status] ?? 0)
</script>
