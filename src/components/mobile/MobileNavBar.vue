<template>
  <div class="mobile-nav-bar">
    <div class="nav-left">
      <div v-if="showBack" class="nav-back" @click="$emit('back')">
        <el-icon :size="20"><ArrowLeft /></el-icon>
      </div>
    </div>
    <div class="nav-title">{{ title }}</div>
    <div class="nav-right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  showMenu: { type: Boolean, default: false },
})
defineEmits(['back'])
</script>

<style lang="scss" scoped>
.mobile-nav-bar {
  height: 46px;
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
  flex-shrink: 0;
  z-index: 10;

  .nav-left, .nav-right {
    width: 60px;
    display: flex;
    align-items: center;
    padding: 0 12px;
  }

  .nav-right {
    justify-content: flex-end;
  }

  .nav-title {
    flex: 1;
    text-align: center;
    font-size: 17px;
    font-weight: 600;
    color: #1a1a1a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-back {
    display: flex;
    align-items: center;
    cursor: pointer;
    color: #333;
    padding: 4px;
    border-radius: 4px;

    &:active {
      background: #f5f5f5;
    }
  }
}
</style>
