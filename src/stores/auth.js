import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '@/db'
import { getPermissionsByRole } from '@/utils/permission'

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const token = ref(localStorage.getItem('census_token') || null)

  const isLoggedIn = computed(() => !!currentUser.value)
  const userRole = computed(() => currentUser.value?.role || '')
  const userAreaCode = computed(() => currentUser.value?.areaCode || '')
  const isAdmin = computed(() => ['super_admin', 'provincial_admin'].includes(userRole.value))
  const permissions = computed(() => getPermissionsByRole(userRole.value))

  async function login(username, password) {
    const user = await db.users.where('username').equals(username).first()
    if (!user) {
      return { success: false, message: '用户名不存在' }
    }
    if (user.status === 'disabled') {
      return { success: false, message: '该账号已被禁用' }
    }
    const hash = await sha256(password)
    if (hash !== user.password) {
      return { success: false, message: '密码错误' }
    }

    currentUser.value = {
      id: user.id,
      username: user.username,
      realName: user.realName,
      role: user.role,
      areaCode: user.areaCode,
      areaName: user.areaName,
      permissions: getPermissionsByRole(user.role),
    }
    token.value = btoa(JSON.stringify({ userId: user.id, timestamp: Date.now() }))
    localStorage.setItem('census_token', token.value)

    // 记录登录日志
    await db.operationLogs.add({
      userId: user.id,
      userName: user.realName,
      action: 'login',
      module: 'system',
      targetId: null,
      detail: `${user.realName} 登录系统`,
      createdAt: new Date().toISOString(),
    })

    return { success: true }
  }

  function logout() {
    currentUser.value = null
    token.value = null
    localStorage.removeItem('census_token')
  }

  async function checkAuth() {
    if (!token.value) return false
    try {
      const payload = JSON.parse(atob(token.value))
      const user = await db.users.get(payload.userId)
      if (!user || user.status === 'disabled') {
        logout()
        return false
      }
      currentUser.value = {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role,
        areaCode: user.areaCode,
        areaName: user.areaName,
        permissions: getPermissionsByRole(user.role),
      }
      return true
    } catch {
      logout()
      return false
    }
  }

  function hasPermission(permission) {
    return permissions.value.includes(permission)
  }

  return {
    currentUser,
    token,
    isLoggedIn,
    userRole,
    userAreaCode,
    isAdmin,
    permissions,
    login,
    logout,
    checkAuth,
    hasPermission,
  }
})
