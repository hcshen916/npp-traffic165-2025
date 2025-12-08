'use client'

import { useState, useEffect } from 'react'
import { getCmsImageUrl } from '../utils/cms'
import { formatDateShort } from '../utils/dateUtils'

interface Post {
  id: number
  attributes: {
    title: string
    slug: string
    excerpt: string
    content: string
    publishedAt: string
    category: { data: { id: number; attributes: { name: string } } } | null
    author: { data: { attributes: { name: string } } } | null
    cover: { url: string; alternativeText?: string } | null
    tags?: { data: Array<{ id: number; attributes: { name: string } }> }
  }
}

interface Category {
  id: number
  name: string
  slug: string
}

interface ArticlesContentProps {
  posts: Post[]
  categories: Category[]
}

export default function ArticlesContent({ posts, categories }: ArticlesContentProps) {
  // 取前 5 個類別作為 Tab
  const topCategories = categories.slice(0, 5)
  
  // 狀態管理
  const [activeTab, setActiveTab] = useState<number | null>(topCategories[0]?.id || null)
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([])

  // 取得最新 6 篇文章
  const latestPosts = posts.slice(0, 6)

  // 根據類別篩選文章
  const getPostsByCategory = (categoryId: number | 'all') => {
    if (categoryId === 'all') {
      return posts
    }
    return posts.filter(post => post.attributes.category?.data?.id === categoryId)
  }

  // 處理 Tab 切換
  const handleTabChange = (categoryId: number) => {
    if (categoryId === activeTab) return
    
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTab(categoryId)
      setDisplayedPosts(getPostsByCategory(categoryId))
      setIsTransitioning(false)
    }, 200)
  }

  // 處理下拉選單變更
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const categoryId = value === 'all' ? 'all' : parseInt(value)
    
    setIsTransitioning(true)
    setSelectedCategory(categoryId)
    setTimeout(() => {
      setDisplayedPosts(getPostsByCategory(categoryId))
      setIsTransitioning(false)
    }, 200)
  }

  // 初始化顯示的文章
  useEffect(() => {
    if (activeTab !== null) {
      setDisplayedPosts(getPostsByCategory(activeTab))
    }
  }, [])

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* 頁面標題 */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ 
          fontSize: '2.25rem', 
          fontWeight: '800', 
          color: '#0f172a', 
          marginBottom: '0.5rem',
          letterSpacing: '-0.025em'
        }}>
          所有文章
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.125rem' }}>
          時代力量對各項交通政策的評估、數據解析與研究報告
        </p>
      </div>

      {/* ====== 上方區塊：最新文章 ====== */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}></span>
            最新發布
          </h2>
          <div style={{
            fontSize: '0.875rem',
            color: '#64748b'
          }}>
            共 {posts.length} 篇文章
          </div>
        </div>

        {/* 最新文章卡片網格 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.5rem'
        }}>
          {latestPosts.map((post) => (
            <ArticleCard key={post.id} post={post} />
          ))}
        </div>

        {latestPosts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: '#f8fafc',
            borderRadius: '1rem',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <div>目前尚無文章</div>
          </div>
        )}
      </section>

      {/* ====== 下方區塊：分類瀏覽 ====== */}
      <section>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}></span>
            分類瀏覽
          </h2>

          {/* 下拉選單 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
              選擇類別：
            </label>
            <select
              className="category-select"
              value={selectedCategory}
              onChange={handleSelectChange}
              style={{
                padding: '0.625rem 1rem',
                fontSize: '0.875rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                background: 'white',
                color: '#334155',
                minWidth: '160px'
              }}
            >
              <option value="all">全部類別</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab 導覽 */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0'
        }}>
          {topCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleTabChange(cat.id)}
              className={`tab-button ${activeTab === cat.id ? 'active' : ''}`}
              style={{
                padding: '0.875rem 1.25rem',
                fontSize: '0.9375rem',
                border: 'none',
                background: 'transparent',
                color: activeTab === cat.id ? '#3b82f6' : '#64748b',
                fontWeight: activeTab === cat.id ? '600' : '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                borderBottom: activeTab === cat.id ? '2px solid #3b82f6' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s ease'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 文章列表 */}
        <div 
          className={isTransitioning ? 'fade-exit' : 'fade-enter'}
          style={{ 
            minHeight: '300px',
            background: '#ffffff',
            borderRadius: '1rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}
        >
          {displayedPosts.length > 0 ? (
            <div>
              {displayedPosts.map((post, index) => (
                <ArticleListItem 
                  key={post.id} 
                  post={post} 
                  isLast={index === displayedPosts.length - 1}
                />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: '#94a3b8'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
              <div style={{ fontSize: '1rem' }}>此類別目前沒有文章</div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

// 文章卡片組件（用於最新文章區塊）
function ArticleCard({ post }: { post: Post }) {
  const coverUrl = getCmsImageUrl(post.attributes.cover?.url)
  const coverAlt = post.attributes.cover?.alternativeText || post.attributes.title || '文章封面'
  const categoryName = post.attributes.category?.data?.attributes?.name || '一般'

  return (
    <article 
      className="article-card"
      style={{
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}
    >
      {/* 封面圖片 */}
      <div style={{
        width: '100%',
        height: '11rem',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={coverAlt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease'
            }}
          />
        ) : (
          <span style={{ 
            fontSize: '3rem',
            opacity: 0.5
          }}>📰</span>
        )}
        {/* 類別標籤 */}
        <span style={{
          position: 'absolute',
          top: '0.75rem',
          left: '0.75rem',
          padding: '0.25rem 0.75rem',
          backgroundColor: 'rgba(59, 130, 246, 0.9)',
          color: 'white',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '600',
          backdropFilter: 'blur(4px)'
        }}>
          {categoryName}
        </span>
      </div>
      
      {/* 內容區 */}
      <div style={{ padding: '1.25rem' }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '0.5rem',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {post.attributes.title}
        </h3>
        
        <p style={{
          color: '#64748b',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          marginBottom: '1rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {post.attributes.excerpt}
        </p>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '0.75rem',
            color: '#94a3b8'
          }}>
            {formatDateShort(post.attributes.publishedAt)}
          </span>
          
          <a 
            href={`/blog/${post.attributes.slug}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            閱讀更多
            <span style={{ fontSize: '0.875rem' }}>→</span>
          </a>
        </div>
      </div>
    </article>
  )
}

// 文章列表項目組件（用於分類瀏覽區塊）
function ArticleListItem({ post, isLast }: { post: Post; isLast: boolean }) {
  const coverUrl = getCmsImageUrl(post.attributes.cover?.url)
  const coverAlt = post.attributes.cover?.alternativeText || post.attributes.title || '文章封面'
  const categoryName = post.attributes.category?.data?.attributes?.name || '一般'
  const authorName = post.attributes.author?.data?.attributes?.name || '匿名作者'

  return (
    <a 
      href={`/blog/${post.attributes.slug}`}
      className="article-list-item"
      style={{
        display: 'flex',
        gap: '1.25rem',
        padding: '1.25rem 1.5rem',
        textDecoration: 'none',
        borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
        cursor: 'pointer'
      }}
    >
      {/* 左側縮圖 */}
      <div style={{
        width: '140px',
        height: '100px',
        flexShrink: 0,
        borderRadius: '0.5rem',
        overflow: 'hidden',
        backgroundColor: '#f1f5f9'
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
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            opacity: 0.4
          }}>
            📰
          </div>
        )}
      </div>

      {/* 右側內容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 標題 */}
        <h4 style={{
          fontSize: '1.0625rem',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '0.375rem',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {post.attributes.title}
        </h4>

        {/* 預覽文字 */}
        <p style={{
          fontSize: '0.875rem',
          color: '#64748b',
          lineHeight: '1.5',
          marginBottom: '0.625rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {post.attributes.excerpt}
        </p>

        {/* 元資料：時間、標籤 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <span style={{
            fontSize: '0.75rem',
            color: '#94a3b8'
          }}>
            {formatDateShort(post.attributes.publishedAt)}
          </span>
          
          <span style={{
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: '#cbd5e1'
          }} />
          
          <span style={{
            fontSize: '0.75rem',
            color: '#94a3b8'
          }}>
            {authorName}
          </span>

          <span style={{
            display: 'inline-block',
            padding: '0.125rem 0.5rem',
            backgroundColor: '#f1f5f9',
            color: '#475569',
            borderRadius: '0.25rem',
            fontSize: '0.6875rem',
            fontWeight: '500'
          }}>
            {categoryName}
          </span>
        </div>
      </div>
    </a>
  )
}

