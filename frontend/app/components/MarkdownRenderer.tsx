'use client'

import { useEffect, useState } from 'react'
import { getClientCmsBaseUrl } from '../utils/cms'

interface MarkdownRendererProps {
  content: string
  className?: string
  style?: React.CSSProperties
}

/**
 * 處理 Markdown 內容中的 CMS 圖片路徑
 * 將相對路徑轉換為完整的 CMS URL
 */
function processCmsImageUrls(content: string): string {
  if (!content) return content
  
  const cmsBaseUrl = getClientCmsBaseUrl()
  
  // 處理 Markdown 圖片語法: ![alt](/uploads/xxx.png)
  // 將相對路徑轉換為完整 URL
  let processed = content.replace(
    /!\[([^\]]*)\]\(\/uploads\/([^)]+)\)/g,
    `![$1](${cmsBaseUrl}/uploads/$2)`
  )
  
  // 處理 HTML img 標籤: <img src="/uploads/xxx.png" />
  processed = processed.replace(
    /src="\/uploads\/([^"]+)"/g,
    `src="${cmsBaseUrl}/uploads/$1"`
  )
  
  // 處理 src='/uploads/xxx.png' (單引號)
  processed = processed.replace(
    /src='\/uploads\/([^']+)'/g,
    `src='${cmsBaseUrl}/uploads/$1'`
  )
  
  return processed
}

export default function MarkdownRenderer({ content, className, style }: MarkdownRendererProps) {
  const [htmlContent, setHtmlContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        // 動態導入 marked 和 DOMPurify
        const { marked } = await import('marked')
        const DOMPurify = (await import('dompurify')).default

        // 先處理 CMS 圖片 URL
        const processedContent = processCmsImageUrls(content || '')

        // 配置 marked
        marked.setOptions({
          breaks: true,
          gfm: true,
        })

        // 轉換 Markdown 為 HTML
        const rawHtml = await marked(processedContent)
        
        // 清理 HTML（防止 XSS），同時允許 img 標籤的屬性
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['img'],
          ADD_ATTR: ['src', 'alt', 'title', 'width', 'height', 'loading']
        })
        
        setHtmlContent(cleanHtml)
      } catch (error) {
        console.error('Markdown rendering failed:', error)
        // 如果渲染失敗，顯示純文字
        setHtmlContent(content.replace(/\n/g, '<br />'))
      } finally {
        setIsLoading(false)
      }
    }

    renderMarkdown()
  }, [content])

  if (isLoading) {
    return (
      <div style={{ 
        ...style, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '200px',
        color: '#6b7280'
      }}>
        載入內容中...
      </div>
    )
  }

  return (
    <div 
      className={className}
      style={{
        ...style,
        // Markdown 樣式
        '& h1': {
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          marginTop: '2rem',
          color: '#111827',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '0.5rem'
        },
        '& h2': {
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '0.75rem',
          marginTop: '1.5rem',
          color: '#374151'
        },
        '& h3': {
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          marginTop: '1rem',
          color: '#374151'
        },
        '& p': {
          marginBottom: '1rem',
          lineHeight: '1.7'
        },
        '& ul, & ol': {
          marginBottom: '1rem',
          paddingLeft: '1.5rem'
        },
        '& li': {
          marginBottom: '0.25rem',
          lineHeight: '1.7'
        },
        '& strong': {
          fontWeight: '600',
          color: '#111827'
        },
        '& em': {
          fontStyle: 'italic'
        },
        '& code': {
          backgroundColor: '#f3f4f6',
          padding: '0.125rem 0.25rem',
          borderRadius: '0.25rem',
          fontSize: '0.875rem',
          fontFamily: 'monospace'
        },
        '& pre': {
          backgroundColor: '#f3f4f6',
          padding: '1rem',
          borderRadius: '0.5rem',
          overflow: 'auto',
          marginBottom: '1rem'
        },
        '& pre code': {
          backgroundColor: 'transparent',
          padding: 0
        },
        '& blockquote': {
          borderLeft: '4px solid #3b82f6',
          paddingLeft: '1rem',
          marginLeft: 0,
          marginBottom: '1rem',
          fontStyle: 'italic',
          color: '#6b7280'
        },
        '& a': {
          color: '#3b82f6',
          textDecoration: 'underline'
        },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '1rem'
        },
        '& th, & td': {
          border: '1px solid #e5e7eb',
          padding: '0.5rem',
          textAlign: 'left'
        },
        '& th': {
          backgroundColor: '#f9fafb',
          fontWeight: '600'
        }
      } as any}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}
