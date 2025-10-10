/**
 * 獲取CMS基礎URL - 服務器端使用
 */
export function getCmsBaseUrl(): string {
  const envBase = (globalThis as any)?.process?.env?.NEXT_PUBLIC_CMS_BASE as string | undefined
  const rawBaseUrl = envBase || 'http://cms:1337'
  // 規範化：移除尾端斜線，並在偵測到 /api 結尾時移除（Strapi v3 無 /api 前綴）
  let normalized = rawBaseUrl.replace(/\/+$/, '')
  if (normalized.endsWith('/api')) {
    normalized = normalized.slice(0, -4)
  }
  return normalized
}

/**
 * 獲取客戶端可訪問的CMS基礎URL
 */
export function getClientCmsBaseUrl(): string {
  const baseUrl = getCmsBaseUrl()
  // 將容器內部主機名替換為外部可訪問的URL
  if (baseUrl.includes('cms:1337')) {
    // 在瀏覽器環境中，使用外部IP
    return baseUrl.replace('cms:1337', '34.81.244.21:1337')
  }
  return baseUrl
}

/**
 * 將CMS圖片URL轉換為客戶端可訪問的完整URL
 */
export function getCmsImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null
  
  const baseUrl = getClientCmsBaseUrl()
  return `${baseUrl}${imagePath}`
}
