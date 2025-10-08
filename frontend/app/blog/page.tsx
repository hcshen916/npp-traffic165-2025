import { getCmsBaseUrl, getCmsImageUrl } from '../utils/cms'

async function getPosts() {
  const base = getCmsBaseUrl()
  try {
    const res = await fetch(`${base}/posts`, {
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
    return { 
      data: Array.isArray(posts) ? posts.map(post => ({
        id: post.id,
        attributes: {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          publishedAt: post.published_at,
          category: post.category ? { data: { id: post.category.id, attributes: { name: post.category.name } } } : null,
          author: post.author ? { data: { attributes: { name: post.author.name } } } : null,
          cover: post.cover
        }
      })) : [] 
    }
  } catch (error) {
    console.error('Failed to fetch posts:', error)
    return { 
      data: [],
      error: `連接錯誤: ${error.message}`,
      apiUrl: `${base}/posts`
    }
  }
}

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
          交安博的部落格
        </h1>
        <p style={{ color: '#6b7280' }}>
          最新交通政策評估、數據解析與研究報告
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '2rem' 
      }}>
        {posts.data?.map((post: any) => {
          const coverUrl = getCmsImageUrl(post.attributes.cover?.url)
          const coverAlt = post.attributes.cover?.alternativeText || post.attributes.title || '文章封面'
          
          return (
          <article key={post.id} style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <div style={{
              width: '100%',
              height: '12rem',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {coverUrl ? (
                <img 
                  src={coverUrl} 
                  alt={coverAlt}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <span style={{ fontSize: '3rem' }}>📰</span>
              )}
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {post.attributes.category?.data?.attributes?.name || '一般'}
                </span>
              </div>
              
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '0.5rem',
                lineHeight: '1.4'
              }}>
                {post.attributes.title}
              </h2>
              
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                marginBottom: '1rem'
              }}>
                {post.attributes.excerpt}
              </p>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: '#9ca3af'
              }}>
                <span>
                  {post.attributes.author?.data?.attributes?.name || '匿名作者'}
                </span>
                <span>
                  {new Date(post.attributes.publishedAt).toLocaleDateString('zh-TW')}
                </span>
              </div>
              
              <a 
                href={`/blog/${post.attributes.slug}`}
                style={{
                  display: 'inline-block',
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '0.375rem',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
              >
                閱讀更多
                            </a>
            </div>
          </article>
          )
        })}        
        
        {posts.error && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '3rem 0',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            margin: '1rem 0'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ color: '#dc2626', marginBottom: '0.5rem', fontWeight: '500' }}>
              無法載入文章
            </div>
            <div style={{ color: '#7f1d1d', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {posts.error}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              API URL: {posts.apiUrl}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
              請確認 Strapi 後台已建立 Post Content Type 並設定權限
            </div>
          </div>
        )}

        {(!posts.data || posts.data.length === 0) && !posts.error && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '3rem 0'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <div style={{ color: '#6b7280' }}>目前尚無文章</div>
          </div>
        )}
      </div>
    </main>
  )
}