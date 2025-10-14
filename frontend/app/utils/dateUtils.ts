/**
 * 日期格式化工具函數
 */

/**
 * 格式化日期為短格式（年/月/日）
 * @param date - 日期字串或 Date 物件
 * @returns 格式化的日期字串
 */
export function formatDateShort(date: string | Date): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDateShort:', date)
      return '無效日期'
    }
    
    return dateObj.toLocaleDateString('zh-TW')
  } catch (error) {
    console.error('Error formatting date:', error)
    return '日期格式錯誤'
  }
}

/**
 * 格式化日期為長格式（年月日 時:分）
 * @param date - 日期字串或 Date 物件
 * @returns 格式化的日期時間字串
 */
export function formatDateLong(date: string | Date): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDateLong:', date)
      return '無效日期'
    }
    
    return dateObj.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return '日期格式錯誤'
  }
}

/**
 * 格式化日期為相對時間（如：2天前、1週前等）
 * @param date - 日期字串或 Date 物件
 * @returns 相對時間字串
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatRelativeTime:', date)
      return '無效日期'
    }
    
    const now = new Date()
    const diffInMs = now.getTime() - dateObj.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
      if (diffInHours === 0) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
        return diffInMinutes <= 1 ? '剛剛' : `${diffInMinutes}分鐘前`
      }
      return `${diffInHours}小時前`
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
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return formatDateShort(date)
  }
}

/**
 * 檢查日期是否有效
 * @param date - 日期字串或 Date 物件
 * @returns 是否為有效日期
 */
export function isValidDate(date: string | Date): boolean {
  if (!date) return false
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return !isNaN(dateObj.getTime())
  } catch {
    return false
  }
}
