<template>
  <el-upload
    :show-file-list="false"
    accept="image/*"
    :auto-upload="false"
    :on-change="handleFile"
  >
    <el-button :loading="loading" :icon="Camera">
      {{ loading ? 'AI 识别中...' : 'AI 识别证照' }}
    </el-button>
  </el-upload>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import { dataEntry } from '@/ai'
import { useAiSettingsStore } from '@/stores/aiSettings'

const emit = defineEmits(['extracted'])

const aiSettings = useAiSettingsStore()
const loading = ref(false)

async function handleFile(file) {
  if (!aiSettings.featureFlags.vision) {
    ElMessage.warning('AI 视觉识别功能未启用')
    return
  }

  loading.value = true
  try {
    // 转 base64
    const base64 = await fileToBase64(file.raw)
    const result = await dataEntry.extractFromPhoto(base64)
    if (result.fields && Object.keys(result.fields).length > 0) {
      emit('extracted', result.fields)
      ElMessage.success(result.message || `识别完成，提取 ${Object.keys(result.fields).length} 个字段`)
    } else {
      ElMessage.warning('未能从图片中识别有效信息')
    }
  } catch (e) {
    ElMessage.error('识别失败：' + e.message)
  } finally {
    loading.value = false
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
</script>