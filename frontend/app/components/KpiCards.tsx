type Metric = { current: number; baseline: number; pct_change: number }

export function KpiCards({ metrics }: { metrics: Record<string, Metric> }) {
  const entries = Object.entries(metrics || {})
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {entries.map(([key, m]) => (
        <div key={key} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 14, color: '#666' }}>{key}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{m.current}</div>
          <div style={{ fontSize: 12 }}>對基準年：{(m.pct_change * 100).toFixed(1)}%</div>
        </div>
      ))}
      {entries.length === 0 && <div>尚無資料</div>}
    </div>
  )
}

