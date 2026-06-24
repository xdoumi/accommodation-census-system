import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import { clearBusinessData, seedDatabase } from './db/seed'
import db from './db'
import { vPermission } from './directives/permission'
import './styles/global.scss'

const app = createApp(App)
const pinia = createPinia()

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.directive('permission', vPermission)

// 初始化 AI 设置
import { useAiSettingsStore } from './stores/aiSettings'
const aiSettings = useAiSettingsStore()
aiSettings.loadFromLocalStorage()

// 启动离线队列监听（恢复网络后自动重试）
import { useOfflineQueue } from './composables/useOfflineQueue'
const offlineQueue = useOfflineQueue()
offlineQueue.start()
// 启动时若已在线则立即尝试 flush 之前未发送的草稿
if (navigator.onLine) offlineQueue.flush()

function shouldResetBusinessData() {
  return window.location.href.includes('resetBusinessData=1')
}

function clearBusinessLocalStorage() {
  const prefixes = ['collection_form_', 'mobile_submit_context']
  const exactKeys = ['census_offline_queue_v1']
  Object.keys(localStorage).forEach(key => {
    if (exactKeys.includes(key) || prefixes.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key)
    }
  })
}

function removeResetParamFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('resetBusinessData')
  const hash = url.hash.replace(/[?&]resetBusinessData=1/g, '').replace('?&', '?').replace(/\?$/, '')
  url.hash = hash
  window.history.replaceState({}, '', url.toString())
}

// 先初始化基础数据，再挂载应用（失败也要挂载，避免白屏）
seedDatabase(db)
  .then(async () => {
    if (!shouldResetBusinessData()) return
    await clearBusinessData(db)
    clearBusinessLocalStorage()
    removeResetParamFromUrl()
    console.info('[Reset] 已清空住宿单位、任务、填报审核记录和移动端草稿，保留用户与贵州区划。')
  })
  .catch(err => {
    console.error('[Seed] 数据初始化失败，应用将以空数据启动：', err)
  })
  .finally(() => {
    app.mount('#app')
  })
