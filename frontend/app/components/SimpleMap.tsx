'use client'

import { useState } from 'react'

interface SimpleMapProps {
  category?: string
  year?: number
  onCategoryChange?: (category: string) => void
}

export default function SimpleMap({ 
  category = 'all', 
  year = 2024, 
  onCategoryChange 
}: SimpleMapProps) {
  const [selectedPoint, setSelectedPoint] = useState<any>(null)

  const categories = [
    { value: 'all', label: '全部' },
    { value: '未禮讓行人', label: '未禮讓行人' },
    { value: '超速', label: '超速' },
    { value: '酒駕', label: '酒駕' },
    { value: '闖紅燈', label: '闖紅燈' }
  ]

  // Mock data points for Taiwan
  const mockPoints = [
    { id: 1, lat: 25.0478, lng: 121.5319, category: '未禮讓行人', victim: '行人' },
    { id: 2, lat: 25.0320, lng: 121.5654, category: '超速', victim: '機車' },
    { id: 3, lat: 24.1477, lng: 120.6736, category: '酒駕', victim: '行人' },
    { id: 4, lat: 23.7881, lng: 120.9571, category: '闖紅燈', victim: '機車' },
    { id: 5, lat: 25.0175, lng: 121.4651, category: '未禮讓行人', victim: '行人' }
  ]

  const filteredPoints = category === 'all' 
    ? mockPoints 
    : mockPoints.filter(p => p.category === category)

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(to bottom right, #dbeafe, #d1fae5)',
      minHeight: '400px'
    }}>
      {/* Category filter */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 10,
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '1rem'
      }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
          事故類別篩選
        </div>
        <select
          value={category}
          onChange={(e) => onCategoryChange?.(e.target.value)}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            outline: 'none',
            backgroundColor: 'white'
          }}
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Info panel */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 10,
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '1rem',
        maxWidth: '18rem'
      }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
          地圖資訊
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          <div style={{ marginBottom: '0.25rem' }}>• 顯示 {year} 年事故資料</div>
          <div style={{ marginBottom: '0.25rem' }}>• 篩選條件: {categories.find(c => c.value === category)?.label}</div>
          <div>• 事故點數: {filteredPoints.length}</div>
        </div>
      </div>

      {/* Taiwan outline map */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%' 
      }}>
        <div style={{
          position: 'relative',
          width: '20rem',
          height: '24rem',
          background: '#e5e7eb',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, #f0f9ff, #dbeafe)'
          }}></div>
          
          {/* Taiwan shape representation */}
          <svg viewBox="0 0 200 300" style={{ 
            position: 'absolute', 
            inset: 0, 
            width: '100%', 
            height: '100%' 
          }}>
            <path
              d="M60 40 Q80 20 120 30 Q160 40 170 80 Q175 120 165 160 Q160 200 140 240 Q120 270 100 260 Q80 250 70 220 Q50 180 45 140 Q40 100 50 70 Q55 50 60 40 Z"
              fill="rgba(34, 197, 94, 0.3)"
              stroke="rgba(34, 197, 94, 0.8)"
              strokeWidth="2"
            />
          </svg>
          
          {/* Event points */}
          {filteredPoints.map((point) => {
            // Convert lat/lng to SVG coordinates (simplified)
            const x = ((point.lng - 120) * 300) + 100
            const y = ((25.5 - point.lat) * 250) + 50
            
            return (
              <div
                key={point.id}
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedPoint(selectedPoint?.id === point.id ? null : point)}
              >
                <div style={{
                  width: '0.75rem',
                  height: '0.75rem',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.2s'
                }}></div>
                
                {/* Popup */}
                {selectedPoint?.id === point.id && (
                  <div style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'white',
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '0.75rem',
                    minWidth: '10rem',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ fontWeight: '500', color: '#111827' }}>事故資訊</div>
                    <div style={{ color: '#6b7280', marginTop: '0.25rem' }}>
                      <div>類別: {point.category}</div>
                      <div>受害者: {point.victim}</div>
                      <div>位置: {point.lat.toFixed(3)}, {point.lng.toFixed(3)}</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        zIndex: 10,
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '1rem'
      }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
          圖例
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          <div style={{
            width: '0.75rem',
            height: '0.75rem',
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            marginRight: '0.5rem'
          }}></div>
          <span>事故發生點</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          點擊事故點查看詳情
        </div>
      </div>

      {/* Status note */}
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        right: '1rem',
        zIndex: 10,
        background: '#eff6ff',
        borderRadius: '0.5rem',
        padding: '0.5rem'
      }}>
        <div style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>
          🗺️ 簡化版地圖 (MapLibre 整合中)
        </div>
      </div>
    </div>
  )
}