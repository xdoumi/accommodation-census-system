import { useAuthStore } from '@/stores/auth'

export const vPermission = {
  mounted(el, binding) {
    const authStore = useAuthStore()
    const requiredPermission = binding.value

    if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
      el.parentNode?.removeChild(el)
    }
  },
}

export function setupPermissionDirective(app) {
  app.directive('permission', vPermission)
}
