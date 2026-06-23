<template>
  <el-card shadow="never" class="top-ranking-card">
    <template #header>
      <div class="ranking-header">
        <el-icon color="#e6a23c"><Trophy /></el-icon>
        <span>{{ title }}</span>
        <el-tag v-if="unit" size="small" effect="plain" style="margin-left: auto;">{{ unit }}</el-tag>
      </div>
    </template>
    <div v-if="!items.length" class="empty">暂无数据</div>
    <ol v-else class="ranking-list">
      <li v-for="(item, idx) in items" :key="item.id || idx" class="ranking-item">
        <span class="rank-no" :class="`rank-${idx + 1}`">{{ idx + 1 }}</span>
        <div class="rank-body">
          <div class="rank-name" :title="item.name">{{ item.name }}</div>
          <div v-if="item.sub" class="rank-sub">{{ item.sub }}</div>
        </div>
        <span class="rank-value">{{ formatValue(item.value) }}</span>
      </li>
    </ol>
  </el-card>
</template>

<script setup>
const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },     // [{ id, name, sub, value }]
  unit: { type: String, default: '' },           // 单位标签，例如 '元'
  format: { type: String, default: 'number' },   // 'number' | 'percent' | 'currency'
})

function formatValue(v) {
  if (v == null) return '-'
  if (props.format === 'percent') return v.toFixed(1) + '%'
  if (props.format === 'currency') return '¥' + Number(v).toLocaleString('zh-CN')
  return Number(v).toLocaleString('zh-CN')
}
</script>

<style lang="scss" scoped>
.top-ranking-card {
  height: 100%;
  :deep(.el-card__header) {
    padding: 12px 16px;
  }
  :deep(.el-card__body) {
    padding: 8px 12px 12px;
  }
}
.ranking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
}
.empty {
  text-align: center;
  color: #c0c4cc;
  padding: 24px 0;
  font-size: 13px;
}
.ranking-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 4px;
  border-bottom: 1px dashed #f0f2f5;
  &:last-child { border-bottom: none; }
}
.rank-no {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f0f2f5;
  color: #909399;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &.rank-1 { background: #f56c6c; color: #fff; }
  &.rank-2 { background: #e6a23c; color: #fff; }
  &.rank-3 { background: #409eff; color: #fff; }
}
.rank-body {
  flex: 1;
  min-width: 0;
  .rank-name {
    font-size: 13px;
    color: #1a1a1a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rank-sub {
    font-size: 11px;
    color: #909399;
    margin-top: 2px;
  }
}
.rank-value {
  font-size: 13px;
  font-weight: 600;
  color: #1a5fc5;
  flex-shrink: 0;
}
</style>
