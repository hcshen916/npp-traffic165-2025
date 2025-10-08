'use client'

import React, { useEffect, useState } from 'react'

export default function PedestrianMapPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let resizeTimeout: number | null = null

    const calcHeight = () => {
      const container = document.getElementById('viz1755098341965') as HTMLDivElement | null
      const width = container?.offsetWidth || window.innerWidth
      const winH = window.innerHeight
      if (window.innerWidth < 768) return Math.max(width * 1.1, 520)
      if (window.innerWidth < 1024) return Math.max(width * 0.9, 640)
      return Math.min(Math.max(width * 0.8, 760), winH * 0.85)
    }

    const applySize = () => {
      const container = document.getElementById('viz1755098341965') as HTMLDivElement | null
      const iframe = document.getElementById('tableauFrame') as HTMLIFrameElement | null
      if (!container || !iframe) return
      const h = calcHeight()
      container.style.height = `${h}px`
      iframe.style.height = `${h}px`
      iframe.style.width = '100%'
      iframe.style.display = 'block'
    }

    // 初次套用尺寸並關閉 Loading
    setTimeout(() => {
      applySize()
      setIsLoading(false)
    }, 100)

    const onResize = () => {
      if (resizeTimeout) window.clearTimeout(resizeTimeout)
      resizeTimeout = window.setTimeout(() => applySize(), 120)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (resizeTimeout) window.clearTimeout(resizeTimeout)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              行人交通事故地圖
            </h1>
          </div>
        </div>
      </div>

      {/* Tableau 圖表容器 */}
      <div className="flex-1 p-4" style={{minHeight: '800px'}}>
        <div className="bg-white rounded-lg shadow-lg h-full overflow-hidden" style={{minHeight: '750px'}}>
          {/* 圖表標題列 */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">行人交通事故地圖分析 - 2020-2024年</h2>
            <p className="text-sm text-gray-600 mt-1">使用工具列探索歷年變化</p>
          </div>
          
          {/* 載入狀態指示器 */}
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <div className="text-gray-600 text-sm">正在載入 Tableau 圖表...</div>
                <div className="text-gray-500 text-xs mt-1">請稍候片刻</div>
              </div>
            </div>
          )}
          
          {/* Tableau 圖表 */}
          <div className="p-4 flex-1">
            <div 
              id='viz1755098341965'
              style={{ position: 'relative', width: '100%', minHeight: '1000px', height: 'calc(100vh - 220px)' }}
            >
              <iframe
                id="tableauFrame"
                title="TableauPedestrianMap"
                src="https://public.tableau.com/views/Taiwanpedestrianaccidentmap/sheet0?:showVizHome=no&:embed=y&:toolbar=yes&language=zh-TW"
                style={{ border: '0', width: '100%', height: '100%' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}