import { notFound } from 'next/navigation'
import MarkdownRenderer from '../../components/MarkdownRenderer'
import { getCmsBaseUrl } from '../../utils/cms'
import { formatDateShort } from '../../utils/dateUtils'

async function getPost(slug: string) {
  const base = getCmsBaseUrl()
  try {
    const res = await fetch(`${base}/posts?slug=${slug}`, {
      next: { revalidate: 600, tags: ['blog'] },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const posts = await res.json()
    const post = Array.isArray(posts) && posts.length > 0 ? posts[0] : null
    if (!post) return null
    
    // 轉換為 v4 格式
    // 優先使用自訂的 publish_date，若無則使用系統的 published_at
    return {
      id: post.id,
      attributes: {
        title: post.title,
        content: post.content,
        publishedAt: post.publish_date || post.published_at,
        category: post.category ? { data: { id: post.category.id, attributes: { name: post.category.name } } } : null,
        author: post.author ? { data: { attributes: { name: post.author.name } } } : null,
        cover: post.cover,
        tags: post.tags ? { data: post.tags.map((t: any) => ({ id: t.id, attributes: { name: t.name, slug: t.slug } })) } : null
      }
    }
  } catch (error) {
    console.error('Failed to fetch post:', error)
    // Mock data fallback
    if (slug === '2024-traffic-safety-policy') {
      return {
        id: 1,
        attributes: {
          title: '2024年交通安全政策新方向',
          content: '本文將深度探討政府最新推出的交通安全政策...',
          publishedAt: '2024-01-15',
          category: { data: { attributes: { name: '政策分析' } } },
          author: { data: { attributes: { name: '交通安全研究團隊' } } },
          tags: null
        }
      }
    }
    return null
  }
}

async function getRelatedPosts(currentPostId: number, categoryId: number | null, currentTagIds: number[]) {
  const base = getCmsBaseUrl()
  try {
    const res = await fetch(`${base}/posts`, {
      next: { revalidate: 600, tags: ['blog'] },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    
    const posts = await res.json()
    
    if (!Array.isArray(posts)) {
      return []
    }

    // 計算每篇文章與當前文章的相關度（標籤重複數量）
    const postsWithRelevance = posts
      .filter(post => post.id !== currentPostId) // 排除當前文章
      .map(post => {
        const postTagIds = (post.tags || []).map((t: any) => t.id)
        // 計算標籤重複數量
        const tagOverlap = currentTagIds.filter(tagId => postTagIds.includes(tagId)).length
        return {
          post,
          tagOverlap,
          publishDate: new Date(post.publish_date || post.published_at || post.created_at)
        }
      })
    
    // 按標籤重複數量優先排序，相同則按發布日期排序
    const sortedPosts = postsWithRelevance
      .sort((a, b) => {
        // 優先考慮標籤重複數量（越多越優先）
        if (b.tagOverlap !== a.tagOverlap) {
          return b.tagOverlap - a.tagOverlap
        }
        // 其次考慮設定的發布日期（越新越優先）
        return b.publishDate.getTime() - a.publishDate.getTime()
      })
      .slice(0, 2) // 只取前2篇
      .map(({ post }) => ({
        id: post.id,
        attributes: {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          publishedAt: post.publish_date || post.published_at || post.created_at,
          category: post.category ? { data: { attributes: { name: post.category.name } } } : null,
          tags: post.tags ? { data: post.tags.map((t: any) => ({ id: t.id, attributes: { name: t.name } })) } : null
        }
      }))

    return sortedPosts
  } catch (error) {
    console.error('Failed to fetch related posts:', error)
    return []
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  
  if (!post) {
    notFound()
  }

  // 獲取相關文章，傳遞當前文章ID、分類ID和標籤ID
  const categoryId = post.attributes.category?.data?.id || null
  const currentTagIds = post.attributes.tags?.data?.map(t => t.id) || []
  const relatedPosts = await getRelatedPosts(post.id, categoryId, currentTagIds)

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
        {/* 麵包屑 */}
        <nav style={{ marginBottom: '2rem' }}>
          <a href="/blog" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← 返回文章列表
          </a>
        </nav>

        {/* 文章標題區 */}
        <header style={{ marginBottom: '2rem' }}>
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

          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 'bold',
            color: '#111827',
            lineHeight: '1.2',
            marginBottom: '1rem'
          }}>
            {post.attributes.title}
          </h1>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            color: '#6b7280',
            fontSize: '0.875rem',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <span>
              作者: {post.attributes.author?.data?.attributes?.name || '匿名作者'}
            </span>
            <span>
            發布時間: {formatDateShort(post.attributes.publishedAt)}
            </span>
          </div>

          {/* 文章標籤 */}
          {post.attributes.tags?.data && post.attributes.tags.data.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {post.attributes.tags.data.map((tag: any) => (
                <a
                  key={tag.id}
                  href={`/search?tag=${tag.attributes.slug}`}
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '9999px',
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  #{tag.attributes.name}
                </a>
              ))}
            </div>
          )}
        </header>

        {/* 文章內容 */}
        <article style={{
          marginBottom: '3rem'
        }}>
          <MarkdownRenderer 
            content={post.attributes.content || '文章內容載入中...'}
            className="markdown-content"
            style={{
              color: '#374151',
              lineHeight: '1.7',
              fontSize: '1rem'
            }}
          />
        </article>

        {/* 分隔線 */}
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '3rem 0' }} />

        {/* 相關文章 */}
        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '1.5rem'
          }}>
            相關文章
          </h2>

          {relatedPosts.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {relatedPosts.map((relatedPost: any) => (
                <a
                  key={relatedPost.id}
                  href={`/blog/${relatedPost.attributes.slug}`}
                  style={{
                    display: 'block',
                    padding: '1.5rem',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    textDecoration: 'none',
                    transition: 'box-shadow 0.2s'
                  }}
                >
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>
                    {relatedPost.attributes.title}
                  </h3>
                  {relatedPost.attributes.excerpt && (
                    <p style={{
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      marginBottom: '0.5rem',
                      lineHeight: '1.4'
                    }}>
                      {relatedPost.attributes.excerpt}
                    </p>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: '#9ca3af'
                  }}>
                    <span>
                      {relatedPost.attributes.category?.data?.attributes?.name || '一般'}
                    </span>
                    <span>
                      {formatDateShort(relatedPost.attributes.publishedAt)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              textAlign: 'center',
              padding: '2rem'
            }}>
              暫無相關文章
            </p>
          )}
        </section>
      </div>
    </main>
  )
}