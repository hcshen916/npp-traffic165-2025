'use client'

import { useEffect, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { getClientCmsBaseUrl } from '../utils/cms'

/**
 * 處理 Markdown 內容中的 CMS 圖片路徑
 * 將相對路徑轉換為完整的 CMS URL
 */
function processCmsImageUrls(content: string): string {
    if (!content) return content
    
    const cmsBaseUrl = getClientCmsBaseUrl()
    
    // 處理 Markdown 圖片語法: ![alt](/uploads/xxx.png)
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

export default function MarkdownContent({ content }: { content: string }) {
    const [html, setHtml] = useState<string>('')

    useEffect(() => {
        const parse = async () => {
            if (!content) {
                setHtml('')
                return
            }
            // 先處理 CMS 圖片 URL
            const processedContent = processCmsImageUrls(content)
            const parsed = await marked.parse(processedContent)
            // 清理 HTML，同時允許 img 標籤的屬性
            setHtml(DOMPurify.sanitize(parsed, {
                ADD_TAGS: ['img'],
                ADD_ATTR: ['src', 'alt', 'title', 'width', 'height', 'loading']
            }))
        }
        parse()
    }, [content])

    return (
        <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{
                background: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
                overflowX: 'auto'
            }}
        />
    )
}
