<template>
  <el-card header="规模与设施" shadow="never">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-form-item label="客房数" prop="rooms">
          <el-input-number v-model="modelValue.rooms" :min="0" :max="9999" placeholder="间" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="床位数" prop="beds">
          <el-input-number v-model="modelValue.beds" :min="0" :max="99999" placeholder="张" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="建筑面积(㎡)" prop="floorArea">
          <el-input-number v-model="modelValue.floorArea" :min="0" :max="999999" placeholder="平方米" style="width: 100%" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="6">
        <el-form-item label="餐饮服务">
          <el-switch v-model="modelValue.hasDining" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="会议室">
          <el-switch v-model="modelValue.hasConference" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="停车场">
          <el-switch v-model="modelValue.hasParking" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="游泳池">
          <el-switch v-model="modelValue.hasPool" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="健身房">
          <el-switch v-model="modelValue.hasGym" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="无障碍设施">
          <el-switch v-model="modelValue.hasAccessibility" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="消防安全合格">
          <el-switch v-model="modelValue.fireSafetyCertified" />
        </el-form-item>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
defineProps({
  modelValue: { type: Object, required: true },
})
</script>
