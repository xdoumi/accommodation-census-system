<template>
  <div class="mobile-tab-bar">
    <div
      v-for="tab in tabs"
      :key="tab.path"
      class="tab-item"
      :class="{ active: isActive(tab.path) }"
      @click="handleTab(tab)"
    >
      <el-icon :size="22"><component :is="tab.icon" /></el-icon>
      <span class="tab-label">{{ tab.label }}</span>
      <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = computed(() => [
  { path: '/m/home', label: '首页', icon: 'HomeFilled' },
  { path: '/m/entry/0/0?mode=new', match: '/m/entry/0/0', label: '新增填报', icon: 'Plus' },
  { path: '/m/units', label: '填写清单', icon: 'DocumentChecked' },
  { path: '/m/profile', label: '我的', icon: 'UserFilled' },
])

function isActive(path) {
  const tab = tabs.value.find(item => item.path === path)
  const matchPath = tab?.match || path
  return route.path === matchPath || route.path.startsWith(matchPath + '/')
}

function handleTab(tab) {
  if (route.path !== tab.path) {
    router.push(tab.path)
  }
}
</script>

<style lang="scss" scoped>
.mobile-tab-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 750px;
  height: 56px;
  display: flex;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;

  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: #909399;
    cursor: pointer;
    position: relative;
    transition: color 0.2s;

    &:active {
      background: #f5f7fa;
    }

    &.active {
      color: #1a5fc5;
    }

    .tab-label {
      font-size: 11px;
      line-height: 1;
    }

    .tab-badge {
      position: absolute;
      top: 4px;
      right: 50%;
      margin-right: -18px;
      min-width: 16px;
      height: 16px;
      line-height: 16px;
      text-align: center;
      font-size: 10px;
      color: #fff;
      background: #f56c6c;
      border-radius: 8px;
      padding: 0 4px;
    }
  }
}
</style>
