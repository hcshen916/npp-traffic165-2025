import BlogCarousel from './components/BlogCarousel'
import KpiCharts from './components/KpiCharts'
import MarkdownContent from './components/MarkdownContent'
import { getCmsBaseUrl } from './utils/cms'

async function getKpis(year: number, baselineYear: number) {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://backend:8000/api'
  try {
    const res = await fetch(`${base}/kpis?baseline_year=${baselineYear}&period=year:${year}`, {
      next: { revalidate: 10, tags: ['kpis'] },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch (error) {
    console.error('Failed to fetch KPIs:', error)
    return { metrics: {} }
  }
}

async function getHomepageSettings() {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://backend:8000/api'
  try {
    const res = await fetch(`${base}/cms/homepage-settings`, {
      next: { revalidate: 10, tags: ['cms'] },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch (error) {
    console.error('Failed to fetch homepage settings:', error)
    return { settings: {} }
  }
}

async function getKpiConfigs() {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://backend:8000/api'
  try {
    const res = await fetch(`${base}/cms/kpi-configs`, {
      next: { revalidate: 10, tags: ['cms'] },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch (error) {
    console.error('Failed to fetch KPI configs:', error)
    return { configs: {} }
  }
}

async function getTopSegments(year: number) {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://backend:8000/api'
  try {
    const res = await fetch(`${base}/segments/top?county=ALL&limit=5&year=${year}`, {
      next: { revalidate: 10, tags: ['segments'] },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch (error) {
    console.error('Failed to fetch segments:', error)
    return { items: [] }
  }
}

async function getLatestPosts() {
  const base = getCmsBaseUrl()
  try {
    // 獲取所有文章，不限數量，之後在前端排序
    const res = await fetch(`${base}/posts?_limit=-1`, {
      next: { revalidate: 10, tags: ['blog'] },
    })
    if (!res.ok) {
      console.error(`Failed to fetch posts: ${res.status}`)
      return []
    }
    const posts = await res.json()
    // 轉換為標準格式
    // 使用 publish_date 作為排序依據，若無則使用 published_at
    const transformedPosts = Array.isArray(posts) ? posts.map((post: any) => ({
      id: post.id,
      attributes: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        publishedAt: post.publish_date || post.published_at,
        category: post.category ? { data: { id: post.category.id, attributes: { name: post.category.name } } } : null,
        author: post.author ? { data: { attributes: { name: post.author.name } } } : null,
        cover: post.cover
      }
    })) : []
    
    // 依照設定的發布日期（publish_date）排序，最新的在前，取前5篇作為輪播
    transformedPosts.sort((a, b) => {
      const dateA = new Date(a.attributes.publishedAt)
      const dateB = new Date(b.attributes.publishedAt)
      return dateB.getTime() - dateA.getTime()
    })
    
    return transformedPosts.slice(0, 5)
  } catch (error) {
    console.error('Failed to fetch latest posts:', error)
    return []
  }
}

export default async function Home() {
  // 1. 先獲取首頁設定，以確定要顯示的年份
  const homepageSettings = await getHomepageSettings()
  const settings = homepageSettings?.settings || {}

  // 從設定中解析年份 (例如 "2025年" -> 2025)，若無設定則預設 2024
  const yearStr = settings.kpi_section_year || '2024'
  const yearMatch = yearStr.match(/(\d{4})/)
  const targetYear = yearMatch ? parseInt(yearMatch[1]) : 2024

  // 從設定中解析基準年，若無設定則預設 2020
  const baselineYearStr = settings.baseline_year || '2020'
  const baselineYearMatch = baselineYearStr.match(/(\d{4})/)
  const baselineYear = baselineYearMatch ? parseInt(baselineYearMatch[1]) : 2020

  // 2. 根據年份並行獲取其他數據
  const [kpis, segments, kpiConfigs, latestPosts] = await Promise.all([
    getKpis(targetYear, baselineYear),
    getTopSegments(targetYear),
    getKpiConfigs(),
    getLatestPosts()
  ])

  const configs = kpiConfigs?.configs || {}

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* 最新文章輪播 */}
      <BlogCarousel posts={latestPosts} />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
          {settings.page_title || '交通安全總覽'}
        </h1>
        <p style={{ color: '#6b7280' }}>
          {settings.page_subtitle || '即時交通事故數據與分析，促進道路安全改善'}
        </p>
      </div>

      {/* KPI 卡片 */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#374151', marginBottom: '1.5rem' }}>
          {settings.kpi_section_title || '關鍵指標'} ({settings.kpi_section_year || '2024年'})
        </h2>
        <KpiCharts metrics={kpis?.metrics || {}} configs={configs} baselineYear={baselineYear} />
      </section>

      {/* 最危險路段 */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#374151' }}>
            {settings.dangerous_roads_title || '最危險路段'}
          </h2>
        </div>
        {settings.dangerous_roads_custom_content ? (
          <MarkdownContent content={settings.dangerous_roads_custom_content} />
        ) : (
          <TopSegmentsTable items={segments?.items || []} />
        )}
      </section>

      {/* 行人交通事故地圖 (Tableau 內嵌) - 暫時隱藏 */}
      {/* 
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#374151' }}>
            {settings.map_section_title || '行人交通事故地圖'}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            行人交通事故地圖分析 - 2020-2024年，使用工具列探索歷年變化
          </p>
        </div>
        <div style={{
          background: 'white',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            minHeight: '800px',
            height: 'calc(100vh - 400px)'
          }}>
            <iframe
              title="行人交通事故地圖"
              src="https://public.tableau.com/views/Taiwanpedestrianaccidentmap/sheet0?:showVizHome=no&:embed=y&:toolbar=yes&language=zh-TW"
              style={{
                border: '0',
                width: '100%',
                height: '100%',
                minHeight: '800px'
              }}
              loading="lazy"
            />
          </div>
        </div>
      </section>
      */}
    </main>
  )
}

function KpiCards({
  metrics,
  configs,
  baselineYear = 2020
}: {
  metrics: Record<string, { current: number; baseline: number; pct_change: number }>
  configs: Record<string, any>
  baselineYear?: number
}) {
  const entries = Object.entries(metrics || {})

  const getMetricLabel = (key: string) => {
    if (configs[key]?.label) {
      return configs[key].label
    }
    const labels: Record<string, string> = {
      fatal_total: '總死亡人數',
      fatal_ped: '行人死亡人數',
      fatal_minor: '兒少死亡人數'
    }
    return labels[key] || key
  }

  const getMetricUnit = (key: string) => {
    if (configs[key]?.unit) {
      return configs[key].unit
    }
    return ''
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem'
    }}>
      {entries.map(([key, m]) => (
        <div key={key} style={{
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          padding: '1.5rem',
          transition: 'box-shadow 0.2s ease-in-out'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>
              {getMetricLabel(key)}
            </div>
          </div>
          <div style={{
            fontSize: '1.875rem',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '0.75rem'
          }}>
            {m.current.toLocaleString()}{getMetricUnit(key) ? ` ${getMetricUnit(key)}` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: m.pct_change >= 0 ? '#dc2626' : '#059669'
            }}>
              {m.pct_change >= 0 ? '↗' : '↘'} {(Math.abs(m.pct_change) * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>vs {baselineYear}年</div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
            {baselineYear}年基準值: {m.baseline.toLocaleString()}
          </div>
        </div>
      ))}
      {entries.length === 0 && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ color: '#6b7280' }}>尚無資料</div>
        </div>
      )}
    </div>
  )
}

function TopSegmentsTable({ items }: { items: any[] }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#f9fafb' }}>
          <tr>
            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>排名</th>
            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>路段名稱</th>
            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>縣市</th>
            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>死亡數</th>
            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>受傷數</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.road_segment_id || index} style={{ borderTop: '1px solid #e5e7eb' }}>
              <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {index < 3 && (
                    <span style={{ marginRight: '0.5rem', fontSize: '1.125rem' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  )}
                  <span style={{ fontWeight: '600' }}>#{index + 1}</span>
                </div>
              </td>
              <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827' }}>
                <span style={{ fontWeight: '500', color: '#2563eb' }}>
                  {item.segment_name || item.road_segment_id || '未命名路段'}
                </span>
              </td>
              <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827' }}>
                <span style={{ fontWeight: '500' }}>{item.county}</span>
              </td>
              <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.125rem 0.625rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b'
                }}>
                  {item.fatal_count || 0} 人
                </span>
              </td>
              <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.125rem 0.625rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: '#fef3c7',
                  color: '#92400e'
                }}>
                  {item.accident_count || 0} 人
                </span>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                <div style={{ color: '#9ca3af', fontSize: '2rem', marginBottom: '1rem' }}>🛣️</div>
                <div style={{ color: '#6b7280' }}>尚無路段資料</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

