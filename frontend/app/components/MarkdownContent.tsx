'use client'

import { useEffect, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export default function MarkdownContent({ content }: { content: string }) {
    const [html, setHtml] = useState<string>('')

    useEffect(() => {
        const parse = async () => {
            if (!content) {
                setHtml('')
                return
            }
            const parsed = await marked.parse(content)
            setHtml(DOMPurify.sanitize(parsed))
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
