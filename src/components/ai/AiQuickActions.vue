<template>
  <div class="quick-actions">
    <div
      v-for="(action, idx) in actions"
      :key="idx"
      class="quick-chip"
      @click="$emit('select', action.text)"
    >
      <el-icon><component :is="action.icon" /></el-icon>
      <span>{{ action.label }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  actions: { type: Array, default: () => [] },
})
defineEmits(['select'])
</script>

<style lang="scss" scoped>
.quick-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  flex-wrap: wrap;
  border-top: 1px solid #f0f0f0;
}

.quick-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: #f5f7fa;
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #e8f0fa;
    border-color: #1a5fc5;
    color: #1a5fc5;
  }

  .el-icon {
    font-size: 13px;
  }
}
</style>
