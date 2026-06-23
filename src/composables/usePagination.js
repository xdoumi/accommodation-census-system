import { reactive } from 'vue'

export function usePagination(defaultPageSize = 20) {
  const pagination = reactive({
    page: 1,
    pageSize: defaultPageSize,
    total: 0,
  })

  function handlePageChange({ page, pageSize }) {
    pagination.page = page
    pagination.pageSize = pageSize
  }

  function resetPage() {
    pagination.page = 1
  }

  return {
    pagination,
    handlePageChange,
    resetPage,
  }
}
