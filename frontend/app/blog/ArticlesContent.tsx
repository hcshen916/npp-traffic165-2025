'use client'

import { useState, useEffect, useMemo } from 'react'
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

// 分頁常數
const POSTS_PER_PAGE = 20

export default function ArticlesContent({ posts, categories }: ArticlesContentProps) {
  // 取前 3 個類別作為主要 Tab
  const topCategories = categories.slice(0, 3)
  
  // 狀態管理 - 使用 'all' 或類別 ID
  const [activeTab, setActiveTab] = useState<number | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // 取得最新 6 篇文章
  const latestPosts = posts.slice(0, 6)

  // 根據類別篩選文章
  const getPostsByCategory = (categoryId: number | 'all') => {
    if (categoryId === 'all') {
      return posts
    }
    return posts.filter(post => post.attributes.category?.data?.id === categoryId)
  }

  // 計算當前分類的所有文章
  const filteredPosts = useMemo(() => {
    return getPostsByCategory(activeTab)
  }, [activeTab, posts])

  // 計算分頁資訊
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE)
  
  // 計算當前頁面顯示的文章
  const displayedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE
    const endIndex = startIndex + POSTS_PER_PAGE
    return filteredPosts.slice(startIndex, endIndex)
  }, [filteredPosts, currentPage])

  // 處理 Tab 切換（包含「全部分類」）
  const handleTabChange = (categoryId: number | 'all') => {
    if (categoryId === activeTab) return
    
    setIsTransitioning(true)
    setCurrentPage(1) // 重置頁碼
    setTimeout(() => {
      setActiveTab(categoryId)
      setSelectedCategory(categoryId)
      setIsTransitioning(false)
    }, 200)
  }

  // 處理下拉選單變更
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const categoryId = value === 'all' ? 'all' : parseInt(value)
    
    setIsTransitioning(true)
    setCurrentPage(1) // 重置頁碼
    setTimeout(() => {
      setActiveTab(categoryId)
      setSelectedCategory(categoryId)
      setIsTransitioning(false)
    }, 200)
  }

  // 處理頁碼切換
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    // 滾動到分類瀏覽區塊頂部
    document.getElementById('category-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  // 初始化顯示全部文章
  useEffect(() => {
    setActiveTab('all')
    setSelectedCategory('all')
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
      <section id="category-section">
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
          {/* 全部分類 Tab */}
          <button
            onClick={() => handleTabChange('all')}
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
            style={{
              padding: '0.875rem 1.25rem',
              fontSize: '0.9375rem',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'all' ? '#3b82f6' : '#64748b',
              fontWeight: activeTab === 'all' ? '600' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderBottom: activeTab === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'all 0.2s ease'
            }}
          >
            📋 全部文章
          </button>
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

        {/* 文章數量與頁碼資訊 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          padding: '0 0.5rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            共 {filteredPosts.length} 篇文章
            {totalPages > 1 && (
              <span style={{ marginLeft: '0.5rem' }}>
                ・ 第 {currentPage}/{totalPages} 頁
              </span>
            )}
          </div>
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

        {/* 分頁導覽 */}
        {totalPages > 1 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
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

// 分頁導覽元件
function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void 
}) {
  // 計算要顯示的頁碼
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5 // 顯示的頁碼數量
    
    if (totalPages <= showPages + 2) {
      // 總頁數較少時，顯示所有頁碼
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 始終顯示第一頁
      pages.push(1)
      
      // 計算中間頁碼的起始和結束
      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)
      
      // 調整以確保顯示足夠的頁碼
      if (currentPage <= 3) {
        end = 4
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3
      }
      
      // 添加省略號和中間頁碼
      if (start > 2) {
        pages.push('ellipsis')
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages - 1) {
        pages.push('ellipsis')
      }
      
      // 始終顯示最後一頁
      pages.push(totalPages)
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()

  const buttonBaseStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '2.5rem',
    height: '2.5rem',
    padding: '0 0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.5rem',
    background: 'white',
    fontSize: '0.875rem',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '0.5rem',
      marginTop: '2rem',
      padding: '1rem 0'
    }}>
      {/* 上一頁按鈕 */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          ...buttonBaseStyle,
          color: currentPage === 1 ? '#cbd5e1' : '#475569',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          opacity: currentPage === 1 ? 0.6 : 1
        }}
      >
        ← 上一頁
      </button>

      {/* 頁碼按鈕 */}
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span 
                key={`ellipsis-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '2.5rem',
                  height: '2.5rem',
                  color: '#94a3b8',
                  fontSize: '0.875rem'
                }}
              >
                ⋯
              </span>
            )
          }
          
          const isActive = page === currentPage
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                ...buttonBaseStyle,
                background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                color: isActive ? 'white' : '#475569',
                border: isActive ? 'none' : '1px solid #e2e8f0',
                fontWeight: isActive ? '600' : '500'
              }}
            >
              {page}
            </button>
          )
        })}
      </div>

      {/* 下一頁按鈕 */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          ...buttonBaseStyle,
          color: currentPage === totalPages ? '#cbd5e1' : '#475569',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          opacity: currentPage === totalPages ? 0.6 : 1
        }}
      >
        下一頁 →
      </button>
    </div>
  )
}

