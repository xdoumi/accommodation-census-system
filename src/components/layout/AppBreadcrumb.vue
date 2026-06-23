<template>
  <el-breadcrumb separator="/" class="app-breadcrumb">
    <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
    <el-breadcrumb-item v-for="item in breadcrumbItems" :key="item.path">
      <router-link v-if="item.to" :to="item.to">{{ item.title }}</router-link>
      <span v-else>{{ item.title }}</span>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbItems = computed(() => {
  const items = []
  const matched = route.matched

  for (const record of matched) {
    if (record.meta?.title && record.meta.title !== '首页') {
      items.push({
        path: record.path,
        title: record.meta.title,
        to: record.meta.parent ? { name: record.meta.parent } : null,
      })
    }
  }
  return items
})
</script>

<style lang="scss" scoped>
.app-breadcrumb {
  margin-bottom: 12px;
  padding: 0;
}
</style>
