<template>
  <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f0f2f5;">
    <el-result icon="warning" title="403" sub-title="抱歉，您没有权限访问此页面">
      <template #extra>
        <el-button type="primary" @click="router.push('/')">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
