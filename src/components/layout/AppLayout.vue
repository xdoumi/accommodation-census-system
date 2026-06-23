<template>
  <el-container class="app-layout">
    <AppSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
    <el-container class="main-container">
      <AppHeader :collapsed="sidebarCollapsed" @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />
      <el-main class="app-main">
        <AppBreadcrumb />
        <router-view />
      </el-main>
    </el-container>
    <AiChatBubble v-if="aiSettings.featureFlags.chatBubble" />
  </el-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElNotification } from 'element-plus'
import { useAiSettingsStore } from '@/stores/aiSettings'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import AppBreadcrumb from './AppBreadcrumb.vue'
import AiChatBubble from '@/components/ai/AiChatBubble.vue'

const sidebarCollapsed = ref(false)
const aiSettings = useAiSettingsStore()

// 监听 AI 真实模式失败、降级到 mock 的全局事件
let lastFailoverTs = 0
function onFailover(e) {
  // 同一窗口避免连续弹（节流 30s）
  const now = Date.now()
  if (now - lastFailoverTs < 30_000) return
  lastFailoverTs = now
  ElNotification({
    title: 'AI 服务降级',
    message: `真实模式调用失败，已自动降级到模拟模式。原因：${e.detail?.reason || '未知'}`,
    type: 'warning',
    duration: 6000,
  })
}
onMounted(() => window.addEventListener('ai:failover', onFailover))
onUnmounted(() => window.removeEventListener('ai:failover', onFailover))
</script>

<style lang="scss" scoped>
.app-layout {
  height: 100vh;
  overflow: hidden;
}

.main-container {
  flex-direction: column;
  overflow: hidden;
}

.app-main {
  background: #f0f2f5;
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}
</style>
