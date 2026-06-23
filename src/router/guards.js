import { useAuthStore } from '@/stores/auth'
import { useAreaStore } from '@/stores/area'

function isMobileDevice() {
  return window.screen.width < 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export function setupGuards(router) {
  // 确保 areas 数据已加载
  router.beforeEach(async (to, from, next) => {
    const areaStore = useAreaStore()
    if (!areaStore.areas.length) {
      await areaStore.fetchAreas()
    }
    next()
  })

  // 登录和权限检查
  router.beforeEach(async (to, from, next) => {
    if (to.meta.public) {
      next()
      return
    }

    const authStore = useAuthStore()

    // 检查是否已登录
    if (!authStore.isLoggedIn) {
      const restored = await authStore.checkAuth()
      if (!restored) {
        const loginPath = to.meta.mobile ? '/m/login' : '/login'
        next({ path: loginPath, query: { redirect: to.fullPath } })
        return
      }
    }

    // 检查权限
    if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
      next({ path: '/403' })
      return
    }

    next()
  })

  // 已登录用户访问登录页时重定向
  router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()

    if (to.path === '/login' && authStore.isLoggedIn) {
      next({ path: '/' })
      return
    }
    if (to.path === '/m/login' && authStore.isLoggedIn) {
      next({ path: '/m/home' })
      return
    }
    next()
  })

  // 首次访问根路径或 /dashboard 时，根据设备类型自动跳转移动端
  router.beforeEach((to, from, next) => {
    const isInitialNav = from.name === undefined
    const targetsPCEntry = to.path === '/' || to.path === '/dashboard'
    if (isInitialNav && targetsPCEntry && isMobileDevice()) {
      next({ path: '/m/home' })
      return
    }
    next()
  })
}
