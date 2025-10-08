'use client'

import { useEffect, useState } from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
  style?: React.CSSProperties
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

        // 配置 marked
        marked.setOptions({
          breaks: true,
          gfm: true,
        })

        // 轉換 Markdown 為 HTML
        const rawHtml = await marked(content || '')
        
        // 清理 HTML（防止 XSS）
        const cleanHtml = DOMPurify.sanitize(rawHtml)
        
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
