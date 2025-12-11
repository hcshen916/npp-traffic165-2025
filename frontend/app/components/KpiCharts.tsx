/**
 * KPI 圖表組件 - 使用純 CSS 和 SVG 實作
 * 支援：卡片、圓餅圖、長條圖、折線圖、highlight、bigtext
 * 包含淡入上滑動畫效果
 */

'use client'

import { useEffect, useState } from 'react'

type Metric = { 
  current: number
  baseline: number
  pct_change: number
}

type KpiConfig = {
  key: string
  label: string
  icon?: string
  unit?: string
  display_type?: 'card' | 'pie' | 'bar' | 'line' | 'highlight' | 'bigtext'
  color_scheme?: 'danger' | 'warning' | 'info' | 'success'
  description?: string  // 詳細描述，bigtext 類型使用此欄位顯示大字
  // highlight 類型專用欄位
  highlight_label?: string  // 中型字體標籤，例如「2024年最多車禍縣市」
  highlight_value?: string  // 大字體數值，例如「台南市」
}

interface KpiChartsProps {
  metrics: Record<string, Metric>
  configs: Record<string, KpiConfig>
  baselineYear?: number
}

// 動畫包裝組件
function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 延遲顯示，產生交錯動畫效果
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, index * 100) // 每個卡片延遲 100ms

    return () => clearTimeout(timer)
  }, [index])

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
      }}
    >
      {children}
    </div>
  )
}

export default function KpiCharts({ metrics, configs, baselineYear = 2020 }: KpiChartsProps) {
  const entries = Object.entries(metrics || {})

  const getConfig = (key: string): KpiConfig => {
    return configs[key] || {
      key,
      label: key,
      unit: '',
      display_type: 'card',
      color_scheme: 'danger',
      highlight_label: '',
      highlight_value: ''
    }
  }

  // 使用 CSS Grid 自動換行，每行最多 3 列，最小寬度 280px
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '1.5rem',
      maxWidth: '100%'
    }}>
      {entries.map(([key, metric], index) => {
        const config = getConfig(key)
        const displayType = config.display_type || 'card'
        
        let CardComponent
        switch (displayType) {
          case 'pie':
            CardComponent = <PieChart metricKey={key} metric={metric} config={config} baselineYear={baselineYear} />
            break
          case 'bar':
            CardComponent = <BarChart metricKey={key} metric={metric} config={config} baselineYear={baselineYear} />
            break
          case 'line':
            CardComponent = <LineChart metricKey={key} metric={metric} config={config} baselineYear={baselineYear} />
            break
          case 'highlight':
            CardComponent = <HighlightCard metricKey={key} metric={metric} config={config} baselineYear={baselineYear} />
            break
          case 'bigtext':
            CardComponent = <BigTextCard metricKey={key} metric={metric} config={config} />
            break
          default:
            CardComponent = <KpiCard metricKey={key} metric={metric} config={config} baselineYear={baselineYear} />
        }
        
        return (
          <AnimatedCard key={key} index={index}>
            {CardComponent}
          </AnimatedCard>
        )
      })}
      {entries.length === 0 && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ color: '#6b7280' }}>尚無資料</div>
        </div>
      )}
    </div>
  )
}

// 原始卡片樣式
function KpiCard({ metricKey, metric, config, baselineYear }: { metricKey: string; metric: Metric; config: KpiConfig; baselineYear: number }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      padding: '1.5rem',
      transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
      height: '100%'
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>
          {config.label}
        </div>
      </div>
      <div style={{ 
        fontSize: '1.875rem', 
        fontWeight: '700', 
        color: '#111827', 
        marginBottom: '0.75rem' 
      }}>
        {metric.current.toLocaleString()}{config.unit ? ` ${config.unit}` : ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ 
          fontSize: '0.875rem', 
          fontWeight: '500',
          color: metric.pct_change >= 0 ? '#dc2626' : '#059669'
        }}>
          {metric.pct_change >= 0 ? '↗' : '↘'} {(Math.abs(metric.pct_change) * 100).toFixed(1)}%
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>vs {baselineYear}年</div>
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
        {baselineYear}年基準值: {metric.baseline.toLocaleString()}
      </div>
    </div>
  )
}

// 圓餅圖
function PieChart({ metricKey, metric, config, baselineYear }: { metricKey: string; metric: Metric; config: KpiConfig; baselineYear: number }) {
  // 計算圓餅圖的百分比
  const total = metric.current + metric.baseline
  const currentPercent = total > 0 ? (metric.current / total) * 100 : 50
  
  // SVG 圓餅圖參數
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const currentStroke = (currentPercent / 100) * circumference
  const rotation = -90 // 從頂部開始

  const colors = {
    danger: ['#dc2626', '#fca5a5'],
    warning: ['#f59e0b', '#fcd34d'],
    info: ['#3b82f6', '#93c5fd'],
    success: ['#10b981', '#6ee7b7']
  }[config.color_scheme || 'danger']

  return (
    <div style={{
      background: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      padding: '1.5rem',
      transition: 'box-shadow 0.2s ease-in-out',
      height: '100%'
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>
          {config.label}
        </div>
      </div>
      
      {/* 圓餅圖 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* 基準值（底層） */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={colors[1]}
            strokeWidth="30"
          />
          {/* 當前值（上層） */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={colors[0]}
            strokeWidth="30"
            strokeDasharray={`${currentStroke} ${circumference}`}
            strokeDashoffset="0"
            transform={`rotate(${rotation} 80 80)`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
          {/* 中心文字 */}
          <text
            x="80"
            y="75"
            textAnchor="middle"
            style={{ fontSize: '24px', fontWeight: 'bold', fill: '#111827' }}
          >
            {metric.current.toLocaleString()}
          </text>
          <text
            x="80"
            y="95"
            textAnchor="middle"
            style={{ fontSize: '12px', fill: '#6b7280' }}
          >
            {config.unit || ''}
          </text>
        </svg>
      </div>

      {/* 圖例 */}
      <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: colors[0] }} />
          <span style={{ color: '#6b7280' }}>當前: {metric.current.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: colors[1] }} />
          <span style={{ color: '#6b7280' }}>{baselineYear}年: {metric.baseline.toLocaleString()}</span>
        </div>
      </div>
      
      {/* 變化百分比 */}
      <div style={{ 
        marginTop: '1rem', 
        padding: '0.75rem',
        borderRadius: '0.375rem',
        background: metric.pct_change >= 0 ? '#fee2e2' : '#d1fae5',
        textAlign: 'center'
      }}>
        <span style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600',
          color: metric.pct_change >= 0 ? '#dc2626' : '#059669'
        }}>
          {metric.pct_change >= 0 ? '↗ 增加' : '↘ 減少'} {(Math.abs(metric.pct_change) * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// 長條圖
function BarChart({ metricKey, metric, config, baselineYear }: { metricKey: string; metric: Metric; config: KpiConfig; baselineYear: number }) {
  const maxValue = Math.max(metric.current, metric.baseline)
  const currentPercent = maxValue > 0 ? (metric.current / maxValue) * 100 : 0
  const baselinePercent = maxValue > 0 ? (metric.baseline / maxValue) * 100 : 0

  const colors = {
    danger: ['#dc2626', '#fca5a5'],
    warning: ['#f59e0b', '#fcd34d'],
    info: ['#3b82f6', '#93c5fd'],
    success: ['#10b981', '#6ee7b7']
  }[config.color_scheme || 'danger']

  return (
    <div style={{
      background: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      padding: '1.5rem',
      transition: 'box-shadow 0.2s ease-in-out',
      height: '100%'
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>
          {config.label}
        </div>
      </div>
      
      {/* 長條圖 */}
      <div style={{ marginBottom: '1rem' }}>
        {/* 當前值 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>當前值</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
              {metric.current.toLocaleString()} {config.unit || ''}
            </span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '24px', 
            background: '#f3f4f6', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${currentPercent}%`,
              height: '100%',
              background: colors[0],
              transition: 'width 0.5s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '8px'
            }}>
              {currentPercent > 20 && (
                <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '600' }}>
                  {currentPercent.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 基準值 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{baselineYear}年</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
              {metric.baseline.toLocaleString()} {config.unit || ''}
            </span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '24px', 
            background: '#f3f4f6', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${baselinePercent}%`,
              height: '100%',
              background: colors[1],
              transition: 'width 0.5s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '8px'
            }}>
              {baselinePercent > 20 && (
                <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '600' }}>
                  {baselinePercent.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 變化百分比 */}
      <div style={{ 
        marginTop: '1rem', 
        padding: '0.75rem',
        borderRadius: '0.375rem',
        background: metric.pct_change >= 0 ? '#fee2e2' : '#d1fae5',
        textAlign: 'center'
      }}>
        <span style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600',
          color: metric.pct_change >= 0 ? '#dc2626' : '#059669'
        }}>
          {metric.pct_change >= 0 ? '↗ 增加' : '↘ 減少'} {(Math.abs(metric.pct_change) * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// 折線圖（簡化版 - 僅顯示趨勢）
function LineChart({ metricKey, metric, config, baselineYear }: { metricKey: string; metric: Metric; config: KpiConfig; baselineYear: number }) {
  // 簡化的折線圖：顯示從基準值到當前值的趨勢
  const width = 280
  const height = 120
  const padding = 20
  
  const maxValue = Math.max(metric.current, metric.baseline) * 1.1
  const minValue = Math.min(metric.current, metric.baseline) * 0.9
  const range = maxValue - minValue || 1

  // 計算點的位置
  const x1 = padding
  const y1 = height - padding - ((metric.baseline - minValue) / range) * (height - 2 * padding)
  const x2 = width - padding
  const y2 = height - padding - ((metric.current - minValue) / range) * (height - 2 * padding)

  const colors = {
    danger: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
    success: '#10b981'
  }[config.color_scheme || 'danger']

  return (
    <div style={{
      background: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      padding: '1.5rem',
      transition: 'box-shadow 0.2s ease-in-out',
      height: '100%'
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>
          {config.label}
        </div>
      </div>
      
      {/* 折線圖 */}
      <svg width={width} height={height} style={{ marginBottom: '1rem' }}>
        {/* 網格線 */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
        
        {/* 折線 */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={colors}
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* 數據點 */}
        <circle cx={x1} cy={y1} r="5" fill={colors} opacity="0.5" />
        <circle cx={x2} cy={y2} r="5" fill={colors} />
        
        {/* 標籤 */}
        <text x={x1} y={y1 - 10} textAnchor="middle" style={{ fontSize: '12px', fill: '#6b7280' }}>
          {baselineYear}年
        </text>
        <text x={x2} y={y2 - 10} textAnchor="middle" style={{ fontSize: '12px', fill: '#6b7280' }}>
          當前
        </text>
      </svg>

      {/* 數值顯示 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{baselineYear}年</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
            {metric.baseline.toLocaleString()} {config.unit || ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>當前值</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
            {metric.current.toLocaleString()} {config.unit || ''}
          </div>
        </div>
      </div>

      {/* 變化百分比 */}
      <div style={{ 
        padding: '0.75rem',
        borderRadius: '0.375rem',
        background: metric.pct_change >= 0 ? '#fee2e2' : '#d1fae5',
        textAlign: 'center'
      }}>
        <span style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600',
          color: metric.pct_change >= 0 ? '#dc2626' : '#059669'
        }}>
          {metric.pct_change >= 0 ? '↗ 增加' : '↘ 減少'} {(Math.abs(metric.pct_change) * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// Highlight 卡片 - 用於突出顯示重要文字資訊
function HighlightCard({ metricKey, metric, config, baselineYear }: { metricKey: string; metric: Metric; config: KpiConfig; baselineYear: number }) {
  const colorSchemes = {
    danger: { 
      bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
      accent: '#dc2626',
      border: '#fca5a5'
    },
    warning: { 
      bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', 
      accent: '#f59e0b',
      border: '#fcd34d'
    },
    info: { 
      bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
      accent: '#3b82f6',
      border: '#93c5fd'
    },
    success: { 
      bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', 
      accent: '#10b981',
      border: '#6ee7b7'
    }
  }
  
  const colors = colorSchemes[config.color_scheme || 'info']

  return (
    <div style={{
      background: colors.bg,
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: `2px solid ${colors.border}`,
      padding: '2rem 1.5rem',
      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '180px',
      textAlign: 'center' as const,
      height: '100%'
    }}>
      {/* 中型字體標籤 */}
      <div style={{ 
        fontSize: '1rem', 
        fontWeight: '500', 
        color: '#4b5563',
        marginBottom: '0.5rem',
        lineHeight: '1.4'
      }}>
        {config.highlight_label || config.label}
      </div>
      
      {/* 大字體數值 */}
      <div style={{ 
        fontSize: '2.5rem', 
        fontWeight: '800', 
        color: colors.accent,
        lineHeight: '1.2',
        letterSpacing: '-0.025em'
      }}>
        {config.highlight_value || metric.current.toLocaleString()}
      </div>

      {/* 可選的底部說明 */}
      {config.unit && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280',
          marginTop: '0.5rem'
        }}>
          {config.unit}
        </div>
      )}
    </div>
  )
}

// BigText 大字卡 - 用於顯示重要文字資訊（description 大字 + current_value 中字）
function BigTextCard({ metricKey, metric, config }: { metricKey: string; metric: Metric; config: KpiConfig }) {
  const colorSchemes = {
    danger: { 
      bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
      accent: '#dc2626',
      border: '#fca5a5',
      textPrimary: '#991b1b',
      textSecondary: '#b91c1c'
    },
    warning: { 
      bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', 
      accent: '#f59e0b',
      border: '#fcd34d',
      textPrimary: '#92400e',
      textSecondary: '#b45309'
    },
    info: { 
      bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
      accent: '#3b82f6',
      border: '#93c5fd',
      textPrimary: '#1e40af',
      textSecondary: '#2563eb'
    },
    success: { 
      bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', 
      accent: '#10b981',
      border: '#6ee7b7',
      textPrimary: '#065f46',
      textSecondary: '#059669'
    }
  }
  
  const colors = colorSchemes[config.color_scheme || 'info']

  return (
    <div style={{
      background: colors.bg,
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: `2px solid ${colors.border}`,
      padding: '2.5rem 2rem',
      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      textAlign: 'center' as const,
      height: '100%'
    }}>
      {/* 大字體 - description 文字 */}
      <div style={{ 
        fontSize: '2rem', 
        fontWeight: '800', 
        color: colors.textPrimary,
        lineHeight: '1.3',
        letterSpacing: '-0.025em',
        marginBottom: '0.75rem'
      }}>
        {config.description || config.label}
      </div>
      
      {/* 中字體 - current_value 數值 */}
      <div style={{ 
        fontSize: '1.25rem', 
        fontWeight: '600', 
        color: colors.textSecondary,
        lineHeight: '1.4'
      }}>
        {metric.current.toLocaleString()}{config.unit ? ` ${config.unit}` : ''}
      </div>
    </div>
  )
}
