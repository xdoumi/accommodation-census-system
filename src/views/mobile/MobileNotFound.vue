<template>
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh;">
    <div style="font-size: 64px; font-weight: 700; color: #dcdfe6;">404</div>
    <p style="color: #909399; margin: 12px 0;">页面不存在</p>
    <el-button type="primary" @click="router.push('/m/home')">返回首页</el-button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
