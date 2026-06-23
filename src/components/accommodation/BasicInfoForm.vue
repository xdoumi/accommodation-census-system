<template>
  <el-card header="基础信息" shadow="never">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item prop="name">
          <template #label>单位名称<AiFieldExplain field="name" /></template>
          <AiAutocomplete v-model="modelValue.name" @select="handleAutocompleteSelect" />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item prop="creditCode">
          <template #label>统一社会信用代码<AiFieldExplain field="creditCode" /></template>
          <el-input v-model="modelValue.creditCode" placeholder="18位信用代码" maxlength="18" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item prop="category">
          <template #label>类别<AiFieldExplain field="category" /></template>
          <el-select v-model="modelValue.category" placeholder="请选择类别" style="width: 100%">
            <el-option v-for="opt in CATEGORY_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="16">
        <el-form-item label="所在区域" prop="areaCode">
          <AreaCascader v-model="areaCodeValue" :level="3" @change="handleAreaChange" />
        </el-form-item>
      </el-col>
      <el-col :span="24">
        <el-form-item label="详细地址" prop="detailAddress">
          <el-input v-model="modelValue.detailAddress" placeholder="请输入详细地址" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item prop="businessType">
          <template #label>经营主体类型<AiFieldExplain field="businessType" /></template>
          <el-select v-model="modelValue.businessType" placeholder="请选择" style="width: 100%">
            <el-option v-for="opt in BUSINESS_TYPE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="证照状态" prop="licenseStatus">
          <el-select v-model="modelValue.licenseStatus" placeholder="请选择" style="width: 100%">
            <el-option v-for="opt in LICENSE_STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="开业日期" prop="openDate">
          <el-date-picker v-model="modelValue.openDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="经营状态" prop="operatingStatus">
          <el-select v-model="modelValue.operatingStatus" placeholder="请选择" style="width: 100%">
            <el-option v-for="opt in OPERATING_STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import AreaCascader from '@/components/common/AreaCascader.vue'
import AiFieldExplain from '@/components/ai/AiFieldExplain.vue'
import AiAutocomplete from '@/components/ai/AiAutocomplete.vue'
import { useAreaStore } from '@/stores/area'
import db from '@/db'
import { CATEGORY_OPTIONS, BUSINESS_TYPE_OPTIONS, LICENSE_STATUS_OPTIONS, OPERATING_STATUS_OPTIONS } from '@/utils/constants'

const props = defineProps({
  modelValue: { type: Object, required: true },
})

const emit = defineEmits(['update:modelValue'])

const areaCodeValue = computed({
  get: () => props.modelValue.countyCode || props.modelValue.cityCode || props.modelValue.provinceCode || '',
  set: () => {},
})

// AI 推荐选中后，复用整条数据
async function handleAutocompleteSelect(item) {
  if (!item?.id) return
  const fullData = await db.accommodations.get(item.id)
  if (fullData) {
    const { id, creditCode, ...rest } = fullData
    emit('update:modelValue', { ...props.modelValue, ...rest })
  }
}

function handleAreaChange(code) {
  const areaStore = useAreaStore()
  const update = { ...props.modelValue }
  if (code) {
    const area = areaStore.getAreaByCode(code)
    if (area) {
      if (area.level === 3) {
        update.countyCode = code
        update.cityCode = area.parentCode
        const parent = areaStore.getAreaByCode(area.parentCode)
        update.provinceCode = parent?.parentCode || ''
      } else if (area.level === 2) {
        update.cityCode = code
        update.countyCode = ''
        update.provinceCode = area.parentCode || ''
      } else {
        update.provinceCode = code
        update.cityCode = ''
        update.countyCode = ''
      }
    }
  }
  emit('update:modelValue', update)
}
</script>
