import { defineStore } from 'pinia'
import { ref } from 'vue'
import db from '@/db'
import { useAuthStore } from './auth'

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const useUserStore = defineStore('user', () => {
  const users = ref([])
  const total = ref(0)
  const filters = ref({ keyword: '', role: '', areaCode: '', status: '' })
  const pagination = ref({ page: 1, pageSize: 20 })
  const loading = ref(false)

  async function fetchUsers() {
    loading.value = true
    try {
      let allUsers = await db.users.toArray()

      // 权限过滤：只能看下级区域的用户
      const auth = useAuthStore()
      if (auth.userRole === 'city_admin') {
        allUsers = allUsers.filter(u => u.areaCode?.startsWith(auth.userAreaCode.substring(0, 4)))
      } else if (auth.userRole === 'county_admin') {
        allUsers = allUsers.filter(u => u.areaCode === auth.userAreaCode)
      } else if (['enumerator', 'reviewer'].includes(auth.userRole)) {
        allUsers = [] // 普查员和审核员不能管理用户
      }

      // 关键词过滤
      if (filters.value.keyword) {
        const kw = filters.value.keyword.toLowerCase()
        allUsers = allUsers.filter(u =>
          u.realName.toLowerCase().includes(kw) ||
          u.username.toLowerCase().includes(kw) ||
          u.phone?.includes(kw)
        )
      }

      // 角色过滤
      if (filters.value.role) {
        allUsers = allUsers.filter(u => u.role === filters.value.role)
      }

      // 区域过滤
      if (filters.value.areaCode) {
        allUsers = allUsers.filter(u => u.areaCode === filters.value.areaCode)
      }

      // 状态过滤
      if (filters.value.status) {
        allUsers = allUsers.filter(u => u.status === filters.value.status)
      }

      total.value = allUsers.length
      const start = (pagination.value.page - 1) * pagination.value.pageSize
      users.value = allUsers.slice(start, start + pagination.value.pageSize)
    } finally {
      loading.value = false
    }
  }

  async function createUser(data) {
    const auth = useAuthStore()
    const now = new Date().toISOString()
    const passwordHash = await sha256(data.password || 'admin123')
    const id = await db.users.add({
      ...data,
      password: passwordHash,
      status: 'active',
      createdBy: auth.currentUser?.id,
      createdAt: now,
      updatedAt: now,
    })
    return id
  }

  async function updateUser(id, data) {
    const updateData = { ...data, updatedAt: new Date().toISOString() }
    // 不更新密码字段（除非单独修改）
    delete updateData.password
    await db.users.update(Number(id), updateData)
  }

  async function toggleUserStatus(id) {
    const user = await db.users.get(Number(id))
    if (user) {
      await db.users.update(Number(id), {
        status: user.status === 'active' ? 'disabled' : 'active',
        updatedAt: new Date().toISOString(),
      })
    }
  }

  async function resetPassword(id, newPassword) {
    const passwordHash = await sha256(newPassword)
    await db.users.update(Number(id), {
      password: passwordHash,
      updatedAt: new Date().toISOString(),
    })
  }

  return {
    users, total, filters, pagination, loading,
    fetchUsers, createUser, updateUser, toggleUserStatus, resetPassword,
  }
})
