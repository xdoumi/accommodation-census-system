<template>
  <el-card header="合规与安全" shadow="never">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-form-item label="消防验收" prop="fireInspection">
          <el-select v-model="modelValue.fireInspection" placeholder="请选择" style="width: 100%">
            <el-option v-for="opt in FIRE_INSPECTION_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="卫生许可" prop="healthPermit">
          <el-select v-model="modelValue.healthPermit" placeholder="请选择" style="width: 100%">
            <el-option v-for="opt in HEALTH_PERMIT_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="近一年安全事故" prop="safetyIncidents">
          <el-input-number v-model="modelValue.safetyIncidents" :min="0" :max="99" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="应急预案">
          <el-switch v-model="modelValue.hasEmergencyPlan" />
        </el-form-item>
      </el-col>
      <el-col :span="16">
        <el-form-item label="特种行业许可证">
          <el-select v-model="permitList" multiple placeholder="请选择" style="width: 100%" @change="handlePermitChange">
            <el-option v-for="p in permitOptions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { FIRE_INSPECTION_OPTIONS, HEALTH_PERMIT_OPTIONS } from '@/utils/constants'

const props = defineProps({
  modelValue: { type: Object, required: true },
})

const emit = defineEmits(['update:modelValue'])

const permitOptions = ['特种行业许可证', '消防安全检查合格证', '公共场所卫生许可证', '营业执照']

const permitList = ref([])

watch(() => props.modelValue.specialPermits, (val) => {
  if (val) {
    try { permitList.value = JSON.parse(val) } catch { permitList.value = [] }
  }
}, { immediate: true })

function handlePermitChange(val) {
  emit('update:modelValue', { ...props.modelValue, specialPermits: JSON.stringify(val) })
}
</script>
