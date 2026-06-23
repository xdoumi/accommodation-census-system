<template>
  <div class="mobile-app">
    <MobileNavBar
      :title="navTitle"
      :show-back="showBack"
      :show-menu="showMenu"
      @back="handleBack"
    />
    <div class="mobile-content">
      <router-view />
    </div>
    <MobileTabBar v-if="showTabBar" />
    <AiChatBubble v-if="aiSettings.featureFlags.chatBubble" :mobile="true" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAiSettingsStore } from '@/stores/aiSettings'
import MobileNavBar from './MobileNavBar.vue'
import MobileTabBar from './MobileTabBar.vue'
import AiChatBubble from '@/components/ai/AiChatBubble.vue'

const route = useRoute()
const router = useRouter()
const aiSettings = useAiSettingsStore()

// 不显示底部 Tab 的页面
const noTabRoutes = ['/m/entry']
const showTabBar = computed(() => !noTabRoutes.some(r => route.path.startsWith(r)))

// 不显示返回按钮的页面
const noBackRoutes = ['/m/home', '/m/tasks', '/m/units', '/m/profile']
const showBack = computed(() => !noBackRoutes.includes(route.path))

const showMenu = computed(() => route.path === '/m/home')

const navTitle = computed(() => {
  const titles = {
    '/m/home': '住宿业普查',
    '/m/tasks': '我的任务',
    '/m/units': '填写的单位清单',
    '/m/profile': '个人中心',
  }
  return route.meta?.mTitle || titles[route.path] || route.meta?.title || ''
})

function handleBack() {
  router.back()
}
</script>
