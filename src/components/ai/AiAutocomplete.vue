<template>
  <el-autocomplete
    v-model="inputValue"
    :fetch-suggestions="fetchSuggestions"
    placeholder="输入单位名称，AI 将推荐相似单位"
    clearable
    style="width: 100%"
    @select="handleSelect"
    @input="$emit('update:modelValue', inputValue)"
  >
    <template #default="{ item }">
      <div class="suggestion-item">
        <div style="font-weight: 500;">{{ item.name }}</div>
        <div style="font-size: 12px; color: #909399;">{{ item.categoryName }} · {{ item.detailAddress }}</div>
      </div>
    </template>
    <template #suffix>
      <el-icon v-if="loading" class="is-loading"><Loading /></el-icon>
      <el-icon v-else-if="aiSettings.featureFlags.autocomplete" color="#1a5fc5"><MagicStick /></el-icon>
    </template>
  </el-autocomplete>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { dataEntry } from '@/ai'
import { useAiSettingsStore } from '@/stores/aiSettings'

const props = defineProps({
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const aiSettings = useAiSettingsStore()
const inputValue = ref(props.modelValue)
const loading = ref(false)
let timer = null

watch(() => props.modelValue, (v) => { inputValue.value = v })

async function fetchSuggestions(queryString, cb) {
  if (!aiSettings.featureFlags.autocomplete || queryString.length < 2) {
    cb([])
    return
  }

  clearTimeout(timer)
  timer = setTimeout(async () => {
    loading.value = true
    try {
      const suggestions = await dataEntry.suggestSimilarUnits(queryString)
      cb(suggestions)
    } catch {
      cb([])
    } finally {
      loading.value = false
    }
  }, 300)
}

function handleSelect(item) {
  emit('select', item)
}
</script>

<style lang="scss" scoped>
.suggestion-item {
  padding: 2px 0;
  line-height: 1.4;
}
</style>