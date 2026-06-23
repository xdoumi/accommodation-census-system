<template>
  <div class="m-steps">
    <div
      v-for="(step, index) in steps"
      :key="index"
      class="m-step"
      :class="{ active: index === current, done: index < current }"
    >
      <div class="m-step-dot" :class="{ active: index === current, done: index < current }">
        <el-icon v-if="index < current" :size="14"><Check /></el-icon>
        <span v-else>{{ index + 1 }}</span>
      </div>
      <div class="m-step-title" :class="{ active: index === current, done: index < current }">
        {{ step }}
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  steps: { type: Array, required: true },
  current: { type: Number, default: 0 },
})
</script>
