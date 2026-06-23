/**
 * 离线提交队列
 *
 * 适用场景：移动端在弱网/无网环境下填报，先把提交请求入队，恢复在线后自动重试。
 *
 * 队列存储在 localStorage，以便页面刷新/重启后仍可恢复。
 *
 * 用法：
 *   const queue = useOfflineQueue()
 *   queue.enqueue({ type: 'updateAccommodation', payload: { id, data } })
 *   queue.start()        // 监听 online 事件
 */
import { ref, computed, onUnmounted } from 'vue'
import db from '@/db'

const STORAGE_KEY = 'census_offline_queue_v1'

// 全局单例 —— 队列、处理器、监听器
let _singleton = null

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function persist(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

/** 任务类型到执行器的映射 —— 在这里集中扩展 */
const handlers = {
  async updateAccommodation({ id, data }) {
    await db.accommodations.update(Number(id), { ...data, updatedAt: new Date().toISOString() })
  },
  async addCensusRecord(payload) {
    await db.censusRecords.add({ ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  },
  async updateAssignmentProgress({ id, progress, status }) {
    await db.censusAssignments.update(Number(id), {
      progress,
      ...(status ? { status } : {}),
      updatedAt: new Date().toISOString(),
    })
  },
}

export function useOfflineQueue() {
  if (_singleton) return _singleton

  const queue = ref(loadFromStorage())
  const processing = ref(false)
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

  const pendingCount = computed(() => queue.value.length)

  function enqueue(task) {
    const item = { id: Date.now() + Math.random().toString(36).slice(2, 8), ts: Date.now(), retries: 0, ...task }
    queue.value.push(item)
    persist(queue.value)
    // 在线则立即尝试 flush
    if (isOnline.value) flush()
    return item
  }

  function remove(id) {
    queue.value = queue.value.filter(t => t.id !== id)
    persist(queue.value)
  }

  async function flush() {
    if (processing.value) return
    if (!queue.value.length) return
    processing.value = true
    try {
      // 按顺序处理；失败的留在队列里
      const remaining = []
      for (const item of [...queue.value]) {
        const handler = handlers[item.type]
        if (!handler) {
          console.warn('[OfflineQueue] 未知任务类型，已丢弃：', item.type)
          continue
        }
        try {
          await handler(item.payload)
        } catch (e) {
          item.retries = (item.retries || 0) + 1
          item.lastError = e.message
          // 重试次数 < 5 则保留
          if (item.retries < 5) remaining.push(item)
          else console.warn('[OfflineQueue] 任务失败次数过多，已放弃：', item)
        }
      }
      queue.value = remaining
      persist(queue.value)
    } finally {
      processing.value = false
    }
  }

  function onOnline() {
    isOnline.value = true
    flush()
  }
  function onOffline() {
    isOnline.value = false
  }

  function start() {
    if (typeof window === 'undefined') return
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
  }

  function stop() {
    if (typeof window === 'undefined') return
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }

  onUnmounted(() => {
    // 在 composable scope 内卸载时只移除监听，不销毁单例
  })

  _singleton = { queue, pendingCount, isOnline, enqueue, remove, flush, start, stop }
  return _singleton
}
