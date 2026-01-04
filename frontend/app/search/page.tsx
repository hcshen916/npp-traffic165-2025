'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCmsImageUrl } from '../utils/cms'
import { formatDateShort } from '../utils/dateUtils'

interface Tag {
  id: number
  name: string
  slug: string
  postCount: number
}

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
    tags?: { data: Array<{ id: number; attributes: { name: string; slug: string } }> }
  }
}

interface SearchResult {
  post: Post
  highlightedTitle: string
  highlightedExcerpt: string
}

const RESULTS_PER_PAGE = 10

export default function SearchPage() {
  const searchParams = useSearchParams()
  const tagFromUrl = searchParams.get('tag')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)
  const [initialTagProcessed, setInitialTagProcessed] = useState(false)

  // 取得所有文章和標籤
  useEffect(() => {
    async function fetchData() {
      try {
        const cmsBase = process.env.NEXT_PUBLIC_CMS_BASE || 'http://cms:1337'
        const baseUrl = cmsBase.replace('cms:1337', window.location.hostname === 'localhost' ? 'localhost:1337' : '34.81.244.21:1337')
        
        // 取得所有文章
        const postsRes = await fetch(`${baseUrl}/posts?_limit=-1`)
        if (postsRes.ok) {
          const postsData = await postsRes.json()
          const transformedPosts = Array.isArray(postsData) ? postsData.map((post: any) => ({
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
              tags: post.tags ? { data: post.tags.map((t: any) => ({ id: t.id, attributes: { name: t.name, slug: t.slug } })) } : null
            }
          })) : []
          setPosts(transformedPosts)
        }

        // 取得所有標籤（依照 id 順序排序，取前5個）
        const tagsRes = await fetch(`${baseUrl}/tags?_sort=id:ASC`)
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json()
          // 計算每個標籤的文章數量
          const tagCounts: Record<string, number> = {}
          if (Array.isArray(tagsData)) {
            tagsData.forEach((tag: any) => {
              if (tag.posts) {
                tagCounts[tag.slug] = tag.posts.length
              } else {
                tagCounts[tag.slug] = 0
              }
            })
          }
          
          const transformedTags = Array.isArray(tagsData) ? tagsData.slice(0, 5).map((tag: any) => ({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            postCount: tagCounts[tag.slug] || 0
          })) : []
          setTags(transformedTags)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // 處理 URL 參數中的標籤
  useEffect(() => {
    if (tagFromUrl && !initialTagProcessed && !isLoading) {
      setSelectedTag(tagFromUrl)
      setHasSearched(true)
      setInitialTagProcessed(true)
    }
  }, [tagFromUrl, isLoading, initialTagProcessed])

  // 高亮關鍵字的函式
  const highlightKeyword = (text: string, keyword: string, isTitle: boolean = false): string => {
    if (!keyword || keyword.length < 2 || !text) return text
    
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const match = text.match(regex)
    
    if (!match) return isTitle ? text : ''
    
    const matchIndex = text.toLowerCase().indexOf(keyword.toLowerCase())
    
    if (isTitle) {
      return text.replace(regex, '<mark style="background-color: #fef08a; padding: 0 2px; border-radius: 2px;">$1</mark>')
    } else {
      // 內容截取：前15字到後30字
      const start = Math.max(0, matchIndex - 15)
      const end = Math.min(text.length, matchIndex + keyword.length + 30)
      let excerpt = text.slice(start, end)
      
      if (start > 0) excerpt = '...' + excerpt
      if (end < text.length) excerpt = excerpt + '...'
      
      return excerpt.replace(regex, '<mark style="background-color: #fef08a; padding: 0 2px; border-radius: 2px;">$1</mark>')
    }
  }

  // 搜尋結果
  const searchResults = useMemo((): SearchResult[] => {
    // 標籤搜尋模式
    if (selectedTag) {
      return posts
        .filter(post => {
          const postTags = post.attributes.tags?.data || []
          return postTags.some(tag => tag.attributes.slug === selectedTag)
        })
        .map(post => ({
          post,
          highlightedTitle: post.attributes.title,
          highlightedExcerpt: post.attributes.excerpt || ''
        }))
    }
    
    // 關鍵字搜尋模式
    if (!submittedQuery || submittedQuery.length < 2) return []
    
    return posts
      .filter(post => {
        const title = post.attributes.title?.toLowerCase() || ''
        const content = post.attributes.content?.toLowerCase() || ''
        const query = submittedQuery.toLowerCase()
        return title.includes(query) || content.includes(query)
      })
      .map(post => {
        const titleMatch = post.attributes.title?.toLowerCase().includes(submittedQuery.toLowerCase())
        const contentMatch = post.attributes.content?.toLowerCase().includes(submittedQuery.toLowerCase())
        
        return {
          post,
          highlightedTitle: titleMatch 
            ? highlightKeyword(post.attributes.title, submittedQuery, true)
            : post.attributes.title,
          highlightedExcerpt: contentMatch 
            ? highlightKeyword(post.attributes.content || '', submittedQuery)
            : (post.attributes.excerpt || '')
        }
      })
  }, [posts, submittedQuery, selectedTag])

  // 分頁
  const totalPages = Math.ceil(searchResults.length / RESULTS_PER_PAGE)
  const paginatedResults = searchResults.slice(
    (currentPage - 1) * RESULTS_PER_PAGE,
    currentPage * RESULTS_PER_PAGE
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.length >= 2) {
      setSelectedTag(null)
      setSubmittedQuery(searchQuery)
      setCurrentPage(1)
      setHasSearched(true)
    }
  }

  const handleTagClick = (tagSlug: string) => {
    setSelectedTag(tagSlug)
    setSearchQuery('')
    setSubmittedQuery('')
    setCurrentPage(1)
    setHasSearched(true)
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 計算標籤字體大小（依照文章數量）
  const getTagFontSize = (postCount: number): string => {
    const maxCount = Math.max(...tags.map(t => t.postCount), 1)
    const minSize = 0.875 // rem
    const maxSize = 1.5 // rem
    const ratio = postCount / maxCount
    const size = minSize + (maxSize - minSize) * ratio
    return `${size}rem`
  }

  const showInitialView = !hasSearched && !selectedTag && !submittedQuery

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: showInitialView ? 'calc(20vh - 4rem) auto 0' : '0 auto',
        transition: 'margin 0.3s ease'
      }}>
        {/* 搜尋標題 */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: '#0f172a', 
            marginBottom: '0.5rem' 
          }}>
            搜尋
          </h1>
        </div>

        {/* 搜尋欄 */}
        <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="請輸入關鍵字（至少2個字）..."
              style={{
                flex: 1,
                padding: '0.875rem 1.25rem',
                fontSize: '1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '0.75rem',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            <button
              type="submit"
              disabled={searchQuery.length < 2}
              style={{
                padding: '0.875rem 1.5rem',
                background: searchQuery.length >= 2 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : '#e2e8f0',
                color: searchQuery.length >= 2 ? 'white' : '#94a3b8',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: searchQuery.length >= 2 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease'
              }}
            >
              搜尋
            </button>
          </div>
        </form>

        {/* 精選標籤 */}
        {tags.length > 0 && (
          <div style={{ 
            marginBottom: '2.5rem',
            textAlign: 'center'
          }}>
            <div style={{ 
              marginBottom: '1rem', 
              color: '#64748b', 
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              熱門標籤
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '1rem',
              border: '1px solid #e2e8f0'
            }}>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.slug)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: selectedTag === tag.slug 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      : 'white',
                    color: selectedTag === tag.slug ? 'white' : '#475569',
                    border: selectedTag === tag.slug ? 'none' : '1px solid #e2e8f0',
                    borderRadius: '9999px',
                    fontSize: getTagFontSize(tag.postCount),
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedTag === tag.slug 
                      ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                      : '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTag !== tag.slug) {
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.color = '#3b82f6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTag !== tag.slug) {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.color = '#475569'
                    }
                  }}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 載入中狀態 */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            載入中...
          </div>
        )}

        {/* 搜尋結果 */}
        {hasSearched && !isLoading && (
          <div>
            {/* 結果標題 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              padding: '0 0.5rem'
            }}>
              <div style={{ color: '#475569', fontSize: '0.9375rem' }}>
                {selectedTag ? (
                  <>標籤「<strong>#{tags.find(t => t.slug === selectedTag)?.name}</strong>」</>
                ) : (
                  <>搜尋「<strong>{submittedQuery}</strong>」</>
                )}
                ：共找到 <strong>{searchResults.length}</strong> 篇文章
              </div>
              {(selectedTag || submittedQuery) && (
                <button
                  onClick={() => {
                    setSelectedTag(null)
                    setSubmittedQuery('')
                    setSearchQuery('')
                    setHasSearched(false)
                    setCurrentPage(1)
                  }}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#f1f5f9',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  清除搜尋
                </button>
              )}
            </div>

            {/* 結果列表 */}
            {paginatedResults.length > 0 ? (
              <div style={{
                background: 'white',
                borderRadius: '1rem',
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
              }}>
                {paginatedResults.map((result, index) => (
                  <SearchResultItem 
                    key={result.post.id} 
                    result={result} 
                    isLast={index === paginatedResults.length - 1}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: '#f8fafc',
                borderRadius: '1rem',
                border: '1px solid #e2e8f0',
                color: '#64748b'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <div style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  找不到相關文章
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  請嘗試使用其他關鍵字
                </div>
              </div>
            )}

            {/* 分頁 */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        )}
      </div>
    </main>
  )
}

// 搜尋結果項目
function SearchResultItem({ result, isLast }: { result: SearchResult; isLast: boolean }) {
  const { post, highlightedTitle, highlightedExcerpt } = result
  const coverUrl = getCmsImageUrl(post.attributes.cover?.url)
  const categoryName = post.attributes.category?.data?.attributes?.name || '一般'
  const authorName = post.attributes.author?.data?.attributes?.name || '匿名作者'
  const postTags = post.attributes.tags?.data || []

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
            alt={post.attributes.title}
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
        <h4 
          style={{
            fontSize: '1.0625rem',
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: '0.375rem',
            lineHeight: '1.4'
          }}
          dangerouslySetInnerHTML={{ __html: highlightedTitle }}
        />

        {/* 預覽文字 */}
        <p 
          style={{
            fontSize: '0.875rem',
            color: '#64748b',
            lineHeight: '1.5',
            marginBottom: '0.625rem'
          }}
          dangerouslySetInnerHTML={{ __html: highlightedExcerpt }}
        />

        {/* 元資料 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {formatDateShort(post.attributes.publishedAt)}
          </span>
          
          <span style={{
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: '#cbd5e1'
          }} />
          
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
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

          {/* 標籤 */}
          {postTags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              style={{
                display: 'inline-block',
                padding: '0.125rem 0.5rem',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                borderRadius: '0.25rem',
                fontSize: '0.6875rem',
                fontWeight: '500'
              }}
            >
              #{tag.attributes.name}
            </span>
          ))}
        </div>
      </div>
    </a>
  )
}

// 分頁元件
function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void 
}) {
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5
    
    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      
      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)
      
      if (currentPage <= 3) {
        end = 4
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3
      }
      
      if (start > 2) {
        pages.push('ellipsis')
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages - 1) {
        pages.push('ellipsis')
      }
      
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

