'use client'

import { useState, useEffect } from 'react'

interface UploadResult {
  status: string
  message: string
  inserted_count: number
  total_rows: number
  errors: Array<{row: number, error: string}>
}

interface Stats {
  summary: {
    total_accidents: number
    total_deaths: number
    total_injuries: number
  }
  yearly_stats: Array<{
    year: number
    accidents: number
    deaths: number
    injuries: number
  }>
  accident_types: Array<{
    type: string
    count: number
    deaths: number
  }>
}

export default function PedestrianUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const response = await fetch(`${apiBase}/pedestrian/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        loadStats()
      } else {
        setResult({
          status: 'error',
          message: data.detail || '上傳失敗',
          inserted_count: 0,
          total_rows: 0,
          errors: []
        })
      }
    } catch (error) {
      setResult({
        status: 'error',
        message: '網路錯誤，請稍後再試',
        inserted_count: 0,
        total_rows: 0,
        errors: []
      })
    } finally {
      setUploading(false)
    }
  }

  const loadStats = async () => {
    setLoadingStats(true)
    setStatsError(null)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const response = await fetch(`${apiBase}/pedestrian/stats`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        setStatsError(`後端錯誤: ${data.error}`)
      }
      
      setStats(data)
    } catch (error) {
      console.error('載入統計資料失敗:', error)
      setStatsError(error instanceof Error ? error.message : '載入統計資料失敗')
      setStats({
        summary: {
          total_accidents: 0,
          total_deaths: 0,
          total_injuries: 0
        },
        yearly_stats: [],
        accident_types: []
      })
    } finally {
      setLoadingStats(false)
    }
  }

  const clearData = async () => {
    if (!confirm('確定要清除所有行人事故資料嗎？此操作無法復原。')) {
      return
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const response = await fetch(`${apiBase}/pedestrian/clear`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('資料已清除')
        setStats(null)
      } else {
        alert('清除失敗')
      }
    } catch (error) {
      alert('清除失敗')
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  // 添加旋轉動畫樣式
  const spinKeyframes = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: spinKeyframes }} />
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0fdf4 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* 主要容器 */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          
          {/* 頁面標題 */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#111827', 
              margin: '0 0 1rem 0'
            }}>
              🚶‍♂️ 行人事故資料管理
            </h1>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '1.125rem',
              margin: '0 0 2rem 0'
            }}>
              上傳、管理和分析行人事故CSV資料
            </p>
            
            {/* 導航按鈕 */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  fontWeight: '500',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 12px -1px rgba(0, 0, 0, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                🗺️ 查看行人事故地圖
              </a>
              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.75rem 1.5rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  fontWeight: '500',
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6'
                }}
              >
                📊 返回首頁
              </a>
            </div>
          </div>

          {/* 主要內容區 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr',
            gap: '2rem'
          }}>
            
            {/* 上傳卡片 */}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #f3f4f6',
              overflow: 'hidden'
            }}>
              {/* 卡片標題 */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white'
              }}>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600',
                  margin: '0 0 0.5rem 0'
                }}>
                  📁 檔案上傳
                </h2>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '1rem',
                  margin: '0'
                }}>
                  支援CSV格式的行人事故資料
                </p>
              </div>
              
              {/* 卡片內容 */}
              <div style={{ padding: '2rem' }}>
                {/* 上傳區域 */}
                <div 
                  style={{
                    border: '3px dashed #d1d5db',
                    borderRadius: '1rem',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    background: '#f9fafb',
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6'
                    e.currentTarget.style.background = '#eff6ff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db'
                    e.currentTarget.style.background = '#f9fafb'
                  }}
                >
                  {/* 上傳圖標 */}
                  <div style={{
                    width: '5rem',
                    height: '5rem',
                    background: '#dbeafe',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem auto'
                  }}>
                    📄
                  </div>
                  
                  {/* 上傳文字 */}
                  <div>
                    <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                      <span style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#111827',
                        transition: 'color 0.2s'
                      }}>
                        選擇CSV檔案或拖拽到此處
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                    </label>
                    <p style={{ 
                      fontSize: '1rem', 
                      color: '#6b7280',
                      margin: '1rem 0 0 0'
                    }}>
                      檔案大小限制：10MB，支援格式：CSV
                    </p>
                  </div>
                </div>

                {/* 檔案預覽 */}
                {file && (
                  <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
                    borderRadius: '1rem',
                    border: '1px solid #bfdbfe'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '3rem',
                          height: '3rem',
                          background: '#3b82f6',
                          borderRadius: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem'
                        }}>
                          📄
                        </div>
                        <div>
                          <div style={{ 
                            fontWeight: '600', 
                            color: '#111827',
                            margin: '0 0 0.25rem 0',
                            fontSize: '1.1rem'
                          }}>
                            {file.name}
                          </div>
                          <div style={{ 
                            fontSize: '0.9rem', 
                            color: '#6b7280',
                            margin: 0
                          }}>
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '1rem 2rem',
                          background: uploading ? '#9ca3af' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          color: 'white',
                          borderRadius: '0.75rem',
                          border: 'none',
                          fontWeight: '600',
                          fontSize: '1rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.2s',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          opacity: uploading ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!uploading) {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 8px 15px -3px rgba(0, 0, 0, 0.2)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!uploading) {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }
                        }}
                      >
                        {uploading ? (
                          <>
                            <span style={{
                              display: 'inline-block',
                              width: '1rem',
                              height: '1rem',
                              marginRight: '0.5rem',
                              border: '2px solid transparent',
                              borderTop: '2px solid white',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                            上傳中...
                          </>
                        ) : (
                          <>
                            🚀 開始上傳
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 上傳結果 */}
                {result && (
                  <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    background: result.status === 'success' 
                      ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' 
                      : 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                    borderRadius: '1rem',
                    border: result.status === 'success' ? '1px solid #86efac' : '1px solid #fca5a5'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '1rem'
                    }}>
                      <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>
                        {result.status === 'success' ? '✅' : '❌'}
                      </span>
                      <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: result.status === 'success' ? '#065f46' : '#991b1b',
                        margin: 0
                      }}>
                        {result.status === 'success' ? '上傳成功！' : '上傳失敗'}
                      </h3>
                    </div>
                    
                    <p style={{
                      color: result.status === 'success' ? '#047857' : '#dc2626',
                      margin: '0 0 1rem 0',
                      fontSize: '1rem'
                    }}>
                      {result.message}
                    </p>
                    
                    {result.status === 'success' && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '1rem',
                        marginTop: '1rem'
                      }}>
                        <div style={{
                          textAlign: 'center',
                          padding: '1rem',
                          background: 'white',
                          borderRadius: '0.75rem',
                          boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: '#059669',
                            margin: '0 0 0.25rem 0'
                          }}>
                            {result.inserted_count}
                          </div>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            margin: 0
                          }}>
                            成功上傳
                          </div>
                        </div>
                        <div style={{
                          textAlign: 'center',
                          padding: '1rem',
                          background: 'white',
                          borderRadius: '0.75rem',
                          boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            margin: '0 0 0.25rem 0'
                          }}>
                            {result.total_rows}
                          </div>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            margin: 0
                          }}>
                            總計筆數
                          </div>
                        </div>
                      </div>
                    )}

                    {result.errors.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#dc2626',
                          margin: '0 0 0.5rem 0'
                        }}>
                          錯誤詳情：
                        </h4>
                        <div style={{
                          maxHeight: '200px',
                          overflowY: 'auto',
                          background: 'white',
                          borderRadius: '0.5rem',
                          padding: '1rem',
                          border: '1px solid #fca5a5'
                        }}>
                          {result.errors.map((error, index) => (
                            <div key={index} style={{
                              fontSize: '0.875rem',
                              color: '#dc2626',
                              padding: '0.25rem 0',
                              borderBottom: index < result.errors.length - 1 ? '1px solid #fecaca' : 'none'
                            }}>
                              第 {error.row} 行：{error.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 格式說明 */}
                <div style={{
                  marginTop: '2rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  borderRadius: '1rem',
                  border: '1px solid #fbbf24'
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#92400e',
                    margin: '0 0 1rem 0',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    📋 CSV 檔案格式要求
                  </h3>
                  <div style={{ color: '#78350f', lineHeight: '1.6' }}>
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                      <strong>必要欄位：</strong>事故類別名稱、發生時間_年月日時分、經度、緯度、死亡人數、受傷人數、Rank1_車種大類、Rank1_車種子類、行人_性別、行人_年齡、發生地點、承辦警局
                    </p>
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                      <strong>時間格式：</strong>YYYY-MM-DD HH:MM（範例：2020-01-02 09:00）
                    </p>
                    <p style={{ margin: '0 0 1rem 0' }}>
                      <strong>經緯度格式：</strong>數字格式，台灣範圍（經度：120.541703，緯度：23.710441）
                    </p>
                    <a
                      href="/sample_pedestrian_data.csv"
                      download
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.5rem 1rem',
                        background: '#f59e0b',
                        color: 'white',
                        borderRadius: '0.5rem',
                        textDecoration: 'none',
                        fontWeight: '500',
                        fontSize: '0.875rem',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#d97706'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f59e0b'}
                    >
                      📥 下載範例檔案
                    </a>
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div style={{
                  marginTop: '2rem',
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={loadStats}
                    disabled={loadingStats}
                    style={{
                      flex: '1',
                      minWidth: '150px',
                      padding: '0.75rem 1.5rem',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.75rem',
                      fontWeight: '500',
                      cursor: loadingStats ? 'not-allowed' : 'pointer',
                      opacity: loadingStats ? 0.7 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!loadingStats) e.currentTarget.style.background = '#2563eb'
                    }}
                    onMouseLeave={(e) => {
                      if (!loadingStats) e.currentTarget.style.background = '#3b82f6'
                    }}
                  >
                    {loadingStats ? '載入中...' : '🔄 重新載入統計'}
                  </button>
                  
                  <button
                    onClick={clearData}
                    style={{
                      flex: '1',
                      minWidth: '150px',
                      padding: '0.75rem 1.5rem',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.75rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                  >
                    🗑️ 清除所有資料
                  </button>
                </div>
              </div>
            </div>

            {/* 統計資料 */}
            {(stats || statsError) && (
              <div style={{
                background: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f3f4f6',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                  color: 'white'
                }}>
                  <h2 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '600',
                    margin: '0 0 0.5rem 0'
                  }}>
                    📊 資料統計概覽
                  </h2>
                  <p style={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    fontSize: '1rem',
                    margin: '0'
                  }}>
                    目前系統中的行人事故資料分析
                  </p>
                </div>
                
                <div style={{ padding: '2rem' }}>
                  {/* 錯誤顯示 */}
                  {statsError && (
                    <div style={{
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                      borderRadius: '1rem',
                      border: '1px solid #fca5a5',
                      marginBottom: '2rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <span style={{ fontSize: '2rem' }}>⚠️</span>
                        <div style={{ flex: 1 }}>
                          <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#dc2626',
                            margin: '0 0 0.5rem 0'
                          }}>
                            載入統計資料時發生錯誤
                          </h3>
                          <p style={{
                            color: '#dc2626',
                            margin: 0
                          }}>
                            {statsError}
                          </p>
                        </div>
                        <button
                          onClick={loadStats}
                          disabled={loadingStats}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '500',
                            cursor: loadingStats ? 'not-allowed' : 'pointer',
                            opacity: loadingStats ? 0.7 : 1
                          }}
                        >
                          {loadingStats ? '重試中...' : '重試載入'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 統計卡片 */}
                  {stats && stats.summary && (
                    <>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '2rem'
                      }}>
                        <div style={{
                          padding: '1.5rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          borderRadius: '1rem',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            margin: '0 0 0.5rem 0'
                          }}>
                            {stats.summary?.total_accidents || 0}
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            opacity: 0.9,
                            margin: 0
                          }}>
                            總事故數
                          </div>
                        </div>
                        
                        <div style={{
                          padding: '1.5rem',
                          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                          borderRadius: '1rem',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            margin: '0 0 0.5rem 0'
                          }}>
                            {stats.summary?.total_deaths || 0}
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            opacity: 0.9,
                            margin: 0
                          }}>
                            總死亡人數
                          </div>
                        </div>
                        
                        <div style={{
                          padding: '1.5rem',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          borderRadius: '1rem',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            margin: '0 0 0.5rem 0'
                          }}>
                            {stats.summary?.total_injuries || 0}
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            opacity: 0.9,
                            margin: 0
                          }}>
                            總受傷人數
                          </div>
                        </div>
                      </div>

                      {/* 詳細統計表格 */}
                      {stats.yearly_stats && stats.yearly_stats.length > 0 && (
                        <div style={{
                          background: '#f9fafb',
                          borderRadius: '1rem',
                          padding: '1.5rem',
                          marginBottom: '1.5rem'
                        }}>
                          <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#111827',
                            margin: '0 0 1rem 0'
                          }}>
                            年度統計
                          </h3>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{
                              width: '100%',
                              borderCollapse: 'collapse'
                            }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>年份</th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>事故數</th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>死亡數</th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>受傷數</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stats.yearly_stats.map((yearStat, index) => (
                                  <tr key={yearStat.year} style={{
                                    background: index % 2 === 0 ? 'white' : '#f9fafb',
                                    borderBottom: '1px solid #e5e7eb'
                                  }}>
                                    <td style={{ padding: '0.75rem', fontWeight: '500', color: '#111827' }}>{yearStat.year}</td>
                                    <td style={{ padding: '0.75rem', color: '#6b7280' }}>{yearStat.accidents}</td>
                                    <td style={{ padding: '0.75rem', color: '#dc2626', fontWeight: '500' }}>{yearStat.deaths}</td>
                                    <td style={{ padding: '0.75rem', color: '#f59e0b', fontWeight: '500' }}>{yearStat.injuries}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 事故類型統計 */}
                      {stats.accident_types && stats.accident_types.length > 0 && (
                        <div style={{
                          background: '#f9fafb',
                          borderRadius: '1rem',
                          padding: '1.5rem'
                        }}>
                          <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#111827',
                            margin: '0 0 1rem 0'
                          }}>
                            🏷️ 事故類型分布（前10名）
                          </h3>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{
                              width: '100%',
                              borderCollapse: 'collapse'
                            }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>事故類型</th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>事故數</th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>死亡數</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stats.accident_types.map((typeStat, index) => (
                                  <tr key={index} style={{
                                    background: index % 2 === 0 ? 'white' : '#f9fafb',
                                    borderBottom: '1px solid #e5e7eb'
                                  }}>
                                    <td style={{ padding: '0.75rem', fontWeight: '500', color: '#111827' }}>{typeStat.type}</td>
                                    <td style={{ padding: '0.75rem', color: '#6b7280' }}>{typeStat.count}</td>
                                    <td style={{ padding: '0.75rem', color: '#dc2626', fontWeight: '500' }}>{typeStat.deaths}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}