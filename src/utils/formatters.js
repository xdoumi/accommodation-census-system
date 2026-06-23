/**
 * 格式化数字为千分位
 */
export function formatNumber(num) {
  if (num == null) return '-'
  return Number(num).toLocaleString('zh-CN')
}

/**
 * 格式化金额（万元）
 */
export function formatCurrency(num) {
  if (num == null) return '-'
  if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return '¥' + Number(num).toLocaleString('zh-CN')
}

/**
 * 格式化百分比
 */
export function formatPercent(num) {
  if (num == null) return '-'
  return Number(num).toFixed(1) + '%'
}

/**
 * 格式化日期
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 截断文本
 */
export function truncateText(text, maxLen = 20) {
  if (!text) return '-'
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
