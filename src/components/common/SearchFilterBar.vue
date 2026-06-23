<template>
  <el-card class="filter-card" shadow="never">
    <el-form :inline="true" :model="filterValues" class="filter-form">
      <template v-for="field in fields" :key="field.key">
        <!-- 文本输入 -->
        <el-form-item v-if="field.type === 'input'" :label="field.label">
          <el-input v-model="filterValues[field.key]" :placeholder="'请输入' + field.label" clearable style="width: 180px" />
        </el-form-item>

        <!-- 下拉选择 -->
        <el-form-item v-else-if="field.type === 'select'" :label="field.label">
          <el-select v-model="filterValues[field.key]" :placeholder="'请选择' + field.label" clearable style="width: 160px">
            <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>

        <!-- 区域级联 -->
        <el-form-item v-else-if="field.type === 'cascader'" :label="field.label">
          <AreaCascader v-model="filterValues[field.key]" :level="field.level || 3" style="width: 260px" />
        </el-form-item>
      </template>

      <el-form-item>
        <el-button type="primary" @click="handleSearch" :icon="Search">查询</el-button>
        <el-button @click="handleReset" :icon="RefreshLeft">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import AreaCascader from './AreaCascader.vue'

const props = defineProps({
  fields: { type: Array, required: true },
  modelValue: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'search', 'reset'])

const filterValues = reactive({ ...props.modelValue })

watch(() => props.modelValue, (val) => {
  Object.assign(filterValues, val)
}, { deep: true })

function handleSearch() {
  emit('update:modelValue', { ...filterValues })
  emit('search', { ...filterValues })
}

function handleReset() {
  for (const field of props.fields) {
    filterValues[field.key] = ''
  }
  emit('update:modelValue', { ...filterValues })
  emit('reset')
}
</script>

<style lang="scss" scoped>
.filter-card {
  :deep(.el-card__body) {
    padding: 16px 20px 0;
  }
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0;

  .el-form-item {
    margin-bottom: 16px;
    margin-right: 16px;
  }
}
</style>
