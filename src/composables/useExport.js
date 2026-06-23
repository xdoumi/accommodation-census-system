import { exportToExcel, ACCOMMODATION_EXPORT_COLUMNS } from '@/utils/excel'

export function useExport() {
  function doExport(data, columns, filename) {
    exportToExcel(data, columns || ACCOMMODATION_EXPORT_COLUMNS, filename)
  }

  return { doExport }
}
