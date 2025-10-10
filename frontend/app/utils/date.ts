/**
 * 統一的日期格式化函數
 * 解決 SSR 和 CSR 日期不一致的問題
 */

/**
 * 格式化日期為台灣格式
 * @param dateString - ISO 日期字串
 * @param options - 格式化選項
 * @returns 格式化後的日期字串
 */
export function formatDate(
  dateString: string | Date,
  options: {
    year?: 'numeric' | '2-digit'
    month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow'
    day?: 'numeric' | '2-digit'
  } = {}
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  
  // 使用固定的時區 (UTC+8) 避免時區差異
  const taiwanTime = new Date(date.getTime() + (8 * 60 * 60 * 1000))
  
  const defaultOptions = {
    year: 'numeric' as const,
    month: 'long' as const,
    day: 'numeric' as const,
    timeZone: 'Asia/Taipei',
    ...options
  }
  
  return taiwanTime.toLocaleDateString('zh-TW', defaultOptions)
}

/**
 * 格式化日期為簡短格式 (YYYY/MM/DD)
 * @param dateString - ISO 日期字串
 * @returns 簡短格式的日期字串
 */
export function formatDateShort(dateString: string | Date): string {
  return formatDate(dateString, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 格式化日期為完整格式 (YYYY年MM月DD日)
 * @param dateString - ISO 日期字串
 * @returns 完整格式的日期字串
 */
export function formatDateFull(dateString: string | Date): string {
  return formatDate(dateString, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * 獲取相對時間 (例如: 3天前)
 * @param dateString - ISO 日期字串
 * @returns 相對時間字串
 */
export function getRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) {
    return '今天'
  } else if (diffInDays === 1) {
    return '昨天'
  } else if (diffInDays < 7) {
    return `${diffInDays}天前`
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `${weeks}週前`
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `${months}個月前`
  } else {
    const years = Math.floor(diffInDays / 365)
    return `${years}年前`
  }
}
