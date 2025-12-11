import { getCmsBaseUrl, getCmsImageUrl } from '../utils/cms'
import ArticlesContent from './ArticlesContent'

async function getPosts() {
  const base = getCmsBaseUrl()
  try {
    const res = await fetch(`${base}/posts?_sort=published_at:DESC`, {
      next: { revalidate: 600, tags: ['blog'] },
    })
    if (!res.ok) {
      console.error(`API Error: ${res.status} - ${res.statusText}`)
      return { 
        data: [],
        error: `API 錯誤: ${res.status} - ${res.statusText}`,
        apiUrl: `${base}/posts`
      }
    }
    const posts = await res.json()
    // Strapi v3 回傳陣列，需要轉換為 v4 格式
    // 優先使用自訂的 publish_date，若無則使用系統的 published_at
    const transformedPosts = Array.isArray(posts) ? posts.map(post => ({
      id: post.id,
      attributes: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        publishedAt: post.publish_date || post.published_at,
        category: post.category ? { data: { id: post.category.id, attributes: { name: post.category.name } } } : null,
        author: post.author ? { data: { attributes: { name: post.author.name } } } : null,
        cover: post.cover,
        tags: post.tags ? { data: post.tags.map((t: any) => ({ id: t.id, attributes: { name: t.name } })) } : null
      }
    })) : []
    
    // 根據發佈日期重新排序（自訂日期優先）
    transformedPosts.sort((a, b) => {
      const dateA = new Date(a.attributes.publishedAt)
      const dateB = new Date(b.attributes.publishedAt)
      return dateB.getTime() - dateA.getTime()
    })
    
    return { data: transformedPosts }
  } catch (error: any) {
    console.error('Failed to fetch posts:', error)
    return { 
      data: [],
      error: `連接錯誤: ${error.message}`,
      apiUrl: `${base}/posts`
    }
  }
}

async function getCategories() {
  const base = getCmsBaseUrl()
  try {
    const res = await fetch(`${base}/categories?_sort=id:ASC`, {
      next: { revalidate: 600, tags: ['categories'] },
    })
    if (!res.ok) {
      console.error(`Categories API Error: ${res.status} - ${res.statusText}`)
      return []
    }
    const categories = await res.json()
    return Array.isArray(categories) ? categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug
    })) : []
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }
}

export default async function BlogPage() {
  const [postsResult, categories] = await Promise.all([
    getPosts(),
    getCategories()
  ])

  // 如果有錯誤，顯示錯誤訊息
  if (postsResult.error) {
    return (
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>
            文章
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.125rem' }}>
            最新交通政策評估、數據解析與研究報告
          </p>
        </div>

        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '1rem',
          margin: '1rem 0'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ color: '#dc2626', marginBottom: '0.5rem', fontWeight: '600', fontSize: '1.125rem' }}>
            無法載入文章
          </div>
          <div style={{ color: '#7f1d1d', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {postsResult.error}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            API URL: {postsResult.apiUrl}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
            請確認 Strapi 後台已建立 Post Content Type 並設定權限
          </div>
        </div>
      </main>
    )
  }

  return <ArticlesContent posts={postsResult.data} categories={categories} />
}
