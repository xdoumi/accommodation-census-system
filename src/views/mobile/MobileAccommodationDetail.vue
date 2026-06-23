<template>
  <div style="padding-bottom: 16px;" v-loading="loading">
    <template v-if="unit">
      <!-- 顶部卡片 -->
      <div class="m-card" style="border-radius: 0 0 16px 16px; margin-top: 0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h3 style="margin: 0; font-size: 17px;">{{ unit.name }}</h3>
            <p style="color: #909399; font-size: 13px; margin-top: 4px;">{{ areaStore.getAreaName(unit.countyCode) }} · {{ unit.detailAddress }}</p>
          </div>
          <CategoryTag :value="unit.category" />
        </div>
        <div style="display: flex; gap: 20px; margin-top: 14px;">
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: 700; color: #1a5fc5;">{{ unit.rooms }}</div>
            <div style="font-size: 12px; color: #909399;">客房</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: 700; color: #67c23a;">{{ unit.occupancyRate }}%</div>
            <div style="font-size: 12px; color: #909399;">入住率</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: 700; color: #e6a23c;">¥{{ unit.adr }}</div>
            <div style="font-size: 12px; color: #909399;">均价</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; font-weight: 700; color: #909399;">{{ unit.staffCount }}</div>
            <div style="font-size: 12px; color: #909399;">员工</div>
          </div>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="m-card">
        <div style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">基本信息</div>
        <div class="info-row"><span class="info-label">经营状态</span><StatusTag :value="unit.operatingStatus" :options="OPERATING_STATUS_OPTIONS" /></div>
        <div class="info-row"><span class="info-label">证照状态</span><StatusTag :value="unit.licenseStatus" :options="LICENSE_STATUS_OPTIONS" /></div>
        <div class="info-row"><span class="info-label">经营主体</span><span>{{ unit.businessType }}</span></div>
        <div class="info-row"><span class="info-label">开业日期</span><span>{{ unit.openDate || '-' }}</span></div>
        <div class="info-row"><span class="info-label">星级</span><span>{{ unit.starRating ? unit.starRating + '星' : '未评级' }}</span></div>
        <div class="info-row"><span class="info-label">品牌</span><span>{{ unit.brandAffiliation || '独立经营' }}</span></div>
      </div>

      <!-- 配套设施 -->
      <div class="m-card">
        <div style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">配套设施</div>
        <div class="facility-grid">
          <div class="facility-item" :class="{ on: unit.hasDining }"><el-icon><Food /></el-icon><span>餐饮</span></div>
          <div class="facility-item" :class="{ on: unit.hasConference }"><el-icon><ChatDotRound /></el-icon><span>会议</span></div>
          <div class="facility-item" :class="{ on: unit.hasParking }"><el-icon><Van /></el-icon><span>停车</span></div>
          <div class="facility-item" :class="{ on: unit.hasPool }"><el-icon><Coffee /></el-icon><span>泳池</span></div>
          <div class="facility-item" :class="{ on: unit.hasGym }"><el-icon><Trophy /></el-icon><span>健身</span></div>
          <div class="facility-item" :class="{ on: unit.hasAccessibility }"><el-icon><Discount /></el-icon><span>无障碍</span></div>
        </div>
      </div>

      <!-- 合规信息 -->
      <div class="m-card">
        <div style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">合规与安全</div>
        <div class="info-row"><span class="info-label">消防验收</span><StatusTag :value="unit.fireInspection" :options="FIRE_INSPECTION_OPTIONS" /></div>
        <div class="info-row"><span class="info-label">卫生许可</span><StatusTag :value="unit.healthPermit" :options="HEALTH_PERMIT_OPTIONS" /></div>
        <div class="info-row"><span class="info-label">安全事故</span><span>{{ unit.safetyIncidents }}次</span></div>
        <div class="info-row"><span class="info-label">应急预案</span><span>{{ unit.hasEmergencyPlan ? '已制定' : '未制定' }}</span></div>
      </div>

      <!-- 操作按钮 -->
      <div style="padding: 0 12px;" v-if="authStore.hasPermission('census:fill')">
        <el-button type="primary" class="m-btn" style="width: 100%;" @click="handleFill">
          填报此单位
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAreaStore } from '@/stores/area'
import { useAuthStore } from '@/stores/auth'
import db from '@/db'
import { OPERATING_STATUS_OPTIONS, LICENSE_STATUS_OPTIONS, FIRE_INSPECTION_OPTIONS, HEALTH_PERMIT_OPTIONS } from '@/utils/constants'
import CategoryTag from '@/components/common/CategoryTag.vue'
import StatusTag from '@/components/common/StatusTag.vue'

const route = useRoute()
const router = useRouter()
const areaStore = useAreaStore()
const authStore = useAuthStore()

const unit = ref(null)
const loading = ref(true)

onMounted(async () => {
  await areaStore.fetchAreas()
  unit.value = await db.accommodations.get(Number(route.params.id))
  loading.value = false
})

function handleFill() {
  // 跳转到填报页面（不带 assignmentId，直接填报该单位）
  router.push(`/m/entry/0/0?unitId=${unit.value.id}`)
}
</script>

<style lang="scss" scoped>
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 14px;

  &:last-child { border-bottom: none; }

  .info-label {
    color: #909399;
  }
}

.facility-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.facility-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #c0c4cc;
  font-size: 12px;

  &.on {
    background: #e8f0fa;
    color: #1a5fc5;
  }

  .el-icon { font-size: 20px; }
}
</style>
