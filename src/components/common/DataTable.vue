<template>
  <div class="data-table-wrapper">
    <el-table
      v-loading="loading"
      :data="data"
      stripe
      border
      style="width: 100%"
      @sort-change="handleSortChange"
    >
      <el-table-column v-if="showIndex" type="index" label="序号" width="60" align="center" />
      <slot />
    </el-table>
    <div class="pagination-wrapper" v-if="pagination.total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  pagination: { type: Object, default: () => ({ page: 1, pageSize: 20, total: 0 }) },
  showIndex: { type: Boolean, default: true },
})

const emit = defineEmits(['page-change', 'sort-change'])

const currentPage = computed({
  get: () => props.pagination.page,
  set: (val) => emit('page-change', { page: val, pageSize: props.pagination.pageSize }),
})

const pageSize = computed({
  get: () => props.pagination.pageSize,
  set: (val) => emit('page-change', { page: 1, pageSize: val }),
})

function handleSizeChange(size) {
  emit('page-change', { page: 1, pageSize: size })
}

function handlePageChange(page) {
  emit('page-change', { page, pageSize: props.pagination.pageSize })
}

function handleSortChange({ prop, order }) {
  emit('sort-change', { field: prop, order: order === 'ascending' ? 'asc' : 'desc' })
}
</script>

<style lang="scss" scoped>
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 8px 0;
}
</style>
