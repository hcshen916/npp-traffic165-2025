import './globals.css'

export const metadata = {
  title: 'Road Safety',
  description: '交通事故數據儀表板',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(to bottom, #f9fafb, white)',
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <nav style={{ 
          background: 'white', 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <div style={{ 
            maxWidth: '1280px', 
            margin: '0 auto', 
            padding: '0 1rem' 
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              height: '4rem',
              alignItems: 'center'
            }}>
              <div>
                <a href="/" style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 'bold', 
                  color: '#111827',
                  textDecoration: 'none'
                }}>
                  道路安全儀表板
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <a href="/" style={{ 
                  color: '#374151', 
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>首頁</a>
                <a href="/blog" style={{ 
                  color: '#374151', 
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}>文章</a>
                <a 
                  href="/search" 
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2.25rem',
                    height: '2.25rem',
                    borderRadius: '0.5rem',
                    color: '#374151',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    background: 'transparent'
                  }}
                  title="搜尋文章"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}

