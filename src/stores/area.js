import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import db from '@/db'

export const useAreaStore = defineStore('area', () => {
  const areas = ref([])
  const loaded = ref(false)

  const areaTree = computed(() => {
    const map = {}
    const roots = []
    areas.value.forEach(area => {
      map[area.code] = { ...area, children: [] }
    })
    areas.value.forEach(area => {
      if (area.parentCode && map[area.parentCode]) {
        map[area.parentCode].children.push(map[area.code])
      } else {
        roots.push(map[area.code])
      }
    })
    return roots
  })

  const provinceList = computed(() => areas.value.filter(a => a.level === 1))

  function getAreaByCode(code) {
    return areas.value.find(a => a.code === code)
  }

  function getAreaName(code) {
    return getAreaByCode(code)?.name || code
  }

  function getCitiesByProvince(provinceCode) {
    return areas.value.filter(a => a.level === 2 && a.parentCode === provinceCode)
  }

  function getCountiesByCity(cityCode) {
    return areas.value.filter(a => a.level === 3 && a.parentCode === cityCode)
  }

  async function fetchAreas() {
    if (loaded.value) return
    areas.value = await db.areas.toArray()
    loaded.value = true
  }

  function resetLoaded() {
    loaded.value = false
  }

  return {
    areas,
    areaTree,
    provinceList,
    getAreaByCode,
    getAreaName,
    getCitiesByProvince,
    getCountiesByCity,
    fetchAreas,
    resetLoaded,
  }
})
