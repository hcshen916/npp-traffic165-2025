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
  // 將容器內部主機名替換為 localhost，供瀏覽器使用
  return baseUrl.replace('cms:1337', 'localhost:1337')
}

/**
 * 將CMS圖片URL轉換為客戶端可訪問的完整URL
 */
export function getCmsImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null
  
  const baseUrl = getClientCmsBaseUrl()
  return `${baseUrl}${imagePath}`
}
