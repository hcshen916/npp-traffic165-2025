'use client'

import { useEffect, useState } from 'react'
import { formatDateFull } from '../utils/date'
import { getCmsImageUrl } from '../utils/cms'

interface Post {
  id: number
  attributes: {
    title: string
    slug: string
    excerpt?: string
    publishedAt: string
    category?: {
      data?: {
        attributes?: {
          name: string
        }
      }
    }
    author?: {
      data?: {
        attributes?: {
          name: string
        }
      }
    }
    cover?: {
      url?: string
      alternativeText?: string
    }
  }
}

interface BlogCarouselProps {
  posts: Post[]
}

export default function BlogCarousel({ posts }: BlogCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const latestPosts = posts.slice(0, 5)
  const hasNoPosts = latestPosts.length === 0

  useEffect(() => {
    if (hasNoPosts) return

    const interval = setInterval(() => {
      handleNext()
    }, 5000) // 每5秒切換

    return () => clearInterval(interval)
  }, [currentIndex, hasNoPosts])

  const handleNext = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev + 1) % latestPosts.length)
    setTimeout(() => setIsAnimating(false), 500)
  }

  const handlePrev = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev - 1 + latestPosts.length) % latestPosts.length)
    setTimeout(() => setIsAnimating(false), 500)
  }

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentIndex) return
    setIsAnimating(true)
    setCurrentIndex(index)
    setTimeout(() => setIsAnimating(false), 500)
  }

  if (hasNoPosts) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '1rem',
        padding: '3rem 2rem',
        marginBottom: '2rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            animation: 'float 3s ease-in-out infinite'
          }}>
            📝
          </div>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '600',
            marginBottom: '0.5rem',
            opacity: 0.95
          }}>
            目前無文章
          </h3>
          <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>
            即將推出更多精彩內容，敬請期待
          </p>
        </div>
        
        {/* 裝飾性背景元素 */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          zIndex: 0
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-5%',
          width: '300px',
          height: '300px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          zIndex: 0
        }} />

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}} />
      </div>
    )
  }

  const currentPost = latestPosts[currentIndex]

  // 檢查是否有文章圖片
  const hasCoverImage = currentPost.attributes.cover?.url
  const coverImageUrl = hasCoverImage ? getCmsImageUrl(currentPost.attributes.cover.url) : null

  return (
    <div style={{
      background: coverImageUrl 
        ? 'transparent'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '1rem',
      padding: '0',
      marginBottom: '2rem',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '300px'
    }}>
      {/* 模糊背景圖片層 */}
      {coverImageUrl && (
        <>
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '-20px',
            right: '-20px',
            bottom: '-20px',
            backgroundImage: `url(${coverImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(8px)',
            transform: 'scale(1.1)',
            zIndex: 0
          }} />
          {/* 深色遮罩層 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 0
          }} />
        </>
      )}
      {/* 輪播內容 */}
      <div style={{
        padding: '3rem 5rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* 最新文章標籤 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{
            display: 'inline-block',
            padding: '0.375rem 0.875rem',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: 'white',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            最新文章
          </span>
        </div>

        {/* 動畫內容 */}
        <div 
          key={currentIndex}
          style={{
            animation: isAnimating ? 'fadeIn 0.5s ease-in-out' : 'none',
            minHeight: '150px'
          }}
        >
          {/* 分類標籤 */}
          {currentPost.attributes.category?.data?.attributes?.name && (
            <div style={{ marginBottom: '0.75rem' }}>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                background: 'rgba(255, 255, 255, 0.25)',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: '500',
                color: 'white'
              }}>
                {currentPost.attributes.category.data.attributes.name}
              </span>
            </div>
          )}

          {/* 標題 */}
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: 'white',
            marginBottom: '1rem',
            lineHeight: '1.3',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
          }}>
            {currentPost.attributes.title}
          </h2>

          {/* 摘要 */}
          {currentPost.attributes.excerpt && (
            <p style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: '1.6',
              marginBottom: '1.5rem',
              maxWidth: '800px'
            }}>
              {currentPost.attributes.excerpt}
            </p>
          )}

          {/* 作者與日期 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            color: 'rgba(255, 255, 255, 0.85)'
          }}>
            {currentPost.attributes.author?.data?.attributes?.name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span>作者：</span>
                {currentPost.attributes.author.data.attributes.name}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>發佈時間：</span>
              {formatDateFull(currentPost.attributes.publishedAt)}
            </span>
          </div>

          {/* 閱讀按鈕 */}
          <a
            href={`/blog/${currentPost.attributes.slug}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'white',
              color: '#667eea',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            閱讀全文
            <span style={{ fontSize: '1.1rem' }}>→</span>
          </a>
        </div>
      </div>

      {/* 控制按鈕 */}
      {latestPosts.length > 1 && (
        <>
          {/* 上一篇 */}
          <button
            onClick={handlePrev}
            disabled={isAnimating}
            style={{
              position: 'absolute',
              left: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              color: 'white',
              fontSize: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              zIndex: 2,
              opacity: isAnimating ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isAnimating) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
            }}
          >
            ‹
          </button>

          {/* 下一篇 */}
          <button
            onClick={handleNext}
            disabled={isAnimating}
            style={{
              position: 'absolute',
              right: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              color: 'white',
              fontSize: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              zIndex: 2,
              opacity: isAnimating ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isAnimating) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
            }}
          >
            ›
          </button>

          {/* 指示器 */}
          <div style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '0.5rem',
            zIndex: 2
          }}>
            {latestPosts.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                disabled={isAnimating}
                style={{
                  width: index === currentIndex ? '2rem' : '0.5rem',
                  height: '0.5rem',
                  borderRadius: '9999px',
                  background: index === currentIndex 
                    ? 'white' 
                    : 'rgba(255, 255, 255, 0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  if (!isAnimating && index !== currentIndex) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (index !== currentIndex) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)'
                  }
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* 裝飾性背景元素 */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-5%',
        width: '300px',
        height: '300px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        zIndex: 0
      }} />

      {/* CSS 動畫 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}} />
    </div>
  )
}

