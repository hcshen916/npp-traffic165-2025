'use client'

import { useEffect, useRef } from 'react'

export default function TableauViz() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const divElement = containerRef.current
    if (!divElement) return

    const vizElement = document.createElement('object')
    vizElement.className = 'tableauViz'
    vizElement.style.display = 'none'

    const addParam = (name: string, value: string) => {
      const p = document.createElement('param')
      p.setAttribute('name', name)
      p.setAttribute('value', value)
      vizElement.appendChild(p)
    }

    addParam('host_url', 'https%3A%2F%2Fpublic.tableau.com%2F')
    addParam('embed_code_version', '3')
    addParam('site_root', '')
    addParam('name', 'A1A2_17551468735360\u002FA1A2')
    addParam('tabs', 'no')
    addParam('toolbar', 'yes')
    addParam('static_image', 'https:\/\/public.tableau.com\/static\/images\/A1\/A1A2_17551468735360\/A1A2\/1.png')
    addParam('animate_transition', 'yes')
    addParam('display_static_image', 'yes')
    addParam('display_spinner', 'yes')
    addParam('display_overlay', 'yes')
    addParam('display_count', 'yes')
    addParam('language', 'zh-TW')
    addParam('filter', 'publish=yes')

    divElement.appendChild(vizElement)

    const setSize = () => {
      vizElement.style.width = '100%'
      vizElement.style.height = divElement ? divElement.offsetWidth * 0.75 + 'px' : '600px'
    }

    setSize()
    window.addEventListener('resize', setSize)

    const existingScript = document.querySelector('script[src="https://public.tableau.com/javascripts/api/viz_v1.js"]') as HTMLScriptElement | null
    if (!existingScript) {
      const scriptElement = document.createElement('script')
      scriptElement.src = 'https://public.tableau.com/javascripts/api/viz_v1.js'
      vizElement.parentNode?.insertBefore(scriptElement, vizElement)
    }

    return () => {
      window.removeEventListener('resize', setSize)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="tableauPlaceholder"
      style={{ position: 'relative', width: '100%' }}
    >
      <noscript>
        <a href="#">
          <img
            alt="各項交通事故A1+A2受傷地圖 - 2023"
            src="https://public.tableau.com/static/images/A1/A1A2_17551468735360/A1A2/1_rss.png"
            style={{ border: 'none' }}
          />
        </a>
      </noscript>
    </div>
  )
}


