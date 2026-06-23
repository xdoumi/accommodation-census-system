<template>
  <el-card header="经营情况" shadow="never">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-form-item prop="occupancyRate">
          <template #label>入住率(%)<AiFieldExplain field="occupancyRate" /></template>
          <el-input-number v-model="modelValue.occupancyRate" :min="0" :max="100" :precision="1" :step="0.5" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item prop="adr">
          <template #label>平均房价(元)<AiFieldExplain field="adr" /></template>
          <el-input-number v-model="modelValue.adr" :min="0" :max="99999" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item prop="revpar">
          <template #label>RevPAR(元)<AiFieldExplain field="revpar" /></template>
          <el-input-number v-model="modelValue.revpar" :min="0" :max="99999" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="年营业收入(元)" prop="annualRevenue">
          <el-input-number v-model="modelValue.annualRevenue" :min="0" :max="999999999" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="从业人数" prop="staffCount">
          <el-input-number v-model="modelValue.staffCount" :min="0" :max="99999" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="客源市场">
          <el-select v-model="guestSources" multiple placeholder="请选择" style="width: 100%" @change="handleGuestSourceChange">
            <el-option v-for="src in GUEST_SOURCE_OPTIONS" :key="src" :label="src" :value="src" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import AiFieldExplain from '@/components/ai/AiFieldExplain.vue'
import { GUEST_SOURCE_OPTIONS } from '@/utils/constants'

const props = defineProps({
  modelValue: { type: Object, required: true },
})

const emit = defineEmits(['update:modelValue'])

const guestSources = ref([])

// 初始化客源市场
watch(() => props.modelValue.guestSourceMarkets, (val) => {
  if (val) {
    try {
      guestSources.value = JSON.parse(val)
    } catch {
      guestSources.value = []
    }
  }
}, { immediate: true })

function handleGuestSourceChange(val) {
  emit('update:modelValue', { ...props.modelValue, guestSourceMarkets: JSON.stringify(val) })
}
</script>
