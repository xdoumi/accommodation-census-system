import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const authStore = useAuthStore()

  const isLoggedIn = computed(() => authStore.isLoggedIn)
  const currentUser = computed(() => authStore.currentUser)
  const userRole = computed(() => authStore.userRole)
  const isAdmin = computed(() => authStore.isAdmin)

  function hasPermission(permission) {
    return authStore.hasPermission(permission)
  }

  return {
    isLoggedIn,
    currentUser,
    userRole,
    isAdmin,
    hasPermission,
  }
}
