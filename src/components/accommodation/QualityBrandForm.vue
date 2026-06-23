<template>
  <el-card header="品质与品牌" shadow="never">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-form-item label="星级" prop="starRating">
          <el-select v-model="modelValue.starRating" placeholder="请选择" clearable style="width: 100%">
            <el-option v-for="opt in STAR_RATING_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="品牌归属" prop="brandAffiliation">
          <el-select v-model="modelValue.brandAffiliation" placeholder="请选择或输入" clearable filterable allow-create style="width: 100%">
            <el-option v-for="b in BRAND_OPTIONS" :key="b" :label="b" :value="b" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="在线评分" prop="onlineRating">
          <el-input-number v-model="modelValue.onlineRating" :min="0" :max="5" :precision="1" :step="0.1" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="投诉量" prop="complaintCount">
          <el-input-number v-model="modelValue.complaintCount" :min="0" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="16">
        <el-form-item label="认证资质">
          <el-select v-model="certList" multiple placeholder="请选择" style="width: 100%" @change="handleCertChange">
            <el-option v-for="c in CERTIFICATION_OPTIONS" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { STAR_RATING_OPTIONS, BRAND_OPTIONS, CERTIFICATION_OPTIONS } from '@/utils/constants'

const props = defineProps({
  modelValue: { type: Object, required: true },
})

const emit = defineEmits(['update:modelValue'])

const certList = ref([])

watch(() => props.modelValue.certifications, (val) => {
  if (val) {
    try { certList.value = JSON.parse(val) } catch { certList.value = [] }
  }
}, { immediate: true })

function handleCertChange(val) {
  emit('update:modelValue', { ...props.modelValue, certifications: JSON.stringify(val) })
}
</script>
