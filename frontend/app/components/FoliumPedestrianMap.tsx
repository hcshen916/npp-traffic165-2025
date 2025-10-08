'use client'

import { useEffect, useState } from 'react'

interface FoliumPedestrianMapProps {
  year?: number
  accidentType?: string
}

export default function FoliumPedestrianMap({ 
  year, 
  accidentType = 'all'
}: FoliumPedestrianMapProps) {
  const [mapHtml, setMapHtml] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [dataCount, setDataCount] = useState(0)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [accidentTypes, setAccidentTypes] = useState<Array<{type: string, count: number}>>([])
  const [selectedYear, setSelectedYear] = useState<number | undefined>(year)
  const [selectedType, setSelectedType] = useState(accidentType)

  // Load available years and accident types
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        
        // Load years
        const yearsResponse = await fetch(`${apiBase}/pedestrian/years`)
        const yearsData = await yearsResponse.json()
        setAvailableYears(yearsData.years || [])
        
        // Load accident types
        const typesResponse = await fetch(`${apiBase}/pedestrian/accident-types`)
        const typesData = await typesResponse.json()
        setAccidentTypes(typesData.accident_types || [])
        
      } catch (error) {
        console.error('Failed to load filter options:', error)
      }
    }

    loadFilters()
  }, [])

  useEffect(() => {
    const loadFoliumMap = async () => {
      setIsLoading(true)
      setError('')
      
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        const params = new URLSearchParams()
        
        if (selectedYear) {
          params.append('year', selectedYear.toString())
        }
        if (selectedType !== 'all') {
          params.append('accident_type', selectedType)
        }

        const response = await fetch(`${apiBase}/pedestrian/folium-map?${params}`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        setMapHtml(data.html)
        setDataCount(data.data_count)
        
      } catch (err) {
        console.error('Failed to load Folium map:', err)
        setError(err instanceof Error ? err.message : '載入地圖時發生錯誤')
      } finally {
        setIsLoading(false)
      }
    }

    loadFoliumMap()
  }, [selectedYear, selectedType])

  return (
    <div className="relative w-full h-full">
      {/* Enhanced Filter controls */}
      <div className="absolute top-4 left-4 z-50 bg-white rounded-xl shadow-xl p-5 max-w-sm border border-gray-200" style={{ zIndex: 1000 }}>
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h3 className="text-sm font-semibold text-gray-800">📊 增強版地圖控制</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🗓️ 年份篩選</label>
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">🔍 全部年份</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  📅 {year}年
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🏷️ 事故類型</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">🔍 全部類型</option>
              {accidentTypes.map((type) => (
                <option key={type.type} value={type.type}>
                  🎯 {type.type} ({type.count})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800 mb-1">
                📍 顯示資料點：{dataCount.toLocaleString()} 筆
              </div>
              <div className="text-xs text-blue-600">
                🗺️ Folium + CartoDB Positron 底圖
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="text-xs text-gray-500 space-y-1">
              <div>💡 <strong>使用說明：</strong></div>
              <div>• 使用右上角統計面板查看即時數據</div>
              <div>• 使用右下角過濾器篩選特定車種</div>
              <div>• 使用圖層控制器切換熱力圖</div>
              <div>• 點擊標記查看詳細資訊</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Map description */}
      <div className="absolute bottom-4 left-4 z-50 bg-white rounded-xl shadow-xl p-4 max-w-xs border border-gray-200" style={{ zIndex: 1000 }}>
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-gray-900">🗺️ 增強版地圖圖例</h4>
        </div>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="font-medium text-gray-800 mb-1">標記類型：</div>
            <div className="flex items-center mb-1">
              <div className="w-3 h-3 rounded-full bg-red-600 mr-2"></div>
              <span>🚨 死亡事故 (A1)</span>
            </div>
            <div className="flex items-center mb-1">
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
              <span>🏥 受傷事故</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
              <span>📍 其他事故</span>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="font-medium text-blue-800 mb-1">熱力圖層：</div>
            <div className="text-blue-700">🔥 全部事故密集度</div>
            <div className="text-red-700">💀 死亡事故熱點</div>
            <div className="text-purple-700">👤 行人事故分布</div>
            <div className="text-green-700">🚗 車種分類熱點</div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-2">
            <div className="font-medium text-yellow-800 mb-1">功能特色：</div>
            <div className="text-yellow-700">📊 即時統計面板</div>
            <div className="text-yellow-700">🎯 智慧過濾器</div>
            <div className="text-yellow-700">🔍 群聚展開功能</div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-40">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <div className="text-gray-600">載入 Folium 地圖中...</div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-40">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-2xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">載入地圖失敗</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              重新載入
            </button>
          </div>
        </div>
      )}

      {/* Folium Map Container */}
      {mapHtml && !isLoading && (
        <div 
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: mapHtml }}
          style={{
            height: '100%',
            width: '100%'
          }}
        />
      )}
    </div>
  )
}
