import { useState, useEffect } from 'react'
import { Inbox, Layers, Clock, UserCheck } from 'lucide-react'

export default function MetricsDashboard({ token, refreshTrigger }) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = () => {
    if (!token) return
    fetch('/api/metrics', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setMetrics(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMetrics()
  }, [token, refreshTrigger])

  if (loading || !metrics) return null

  const openCount = metrics.by_status?.open || 0
  const resolvedCount = metrics.by_status?.resolved || 0
  const totalCount = metrics.total_tickets || (openCount + resolvedCount)

  // Include ALL categories (IT, HR, Finance, Admin, Other) sorted by count
  const categoryEntries = Object.entries(metrics.by_category || {})
  const categorySummary = categoryEntries
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(' · ')

  const cards = [
    {
      label: 'Total Tickets',
      val: totalCount,
      subtext: `${openCount} open · ${resolvedCount} resolved`,
      icon: Inbox,
      iconBg: 'rgba(99, 102, 241, 0.1)',
      iconColor: '#6366f1'
    },
    {
      label: 'Categories',
      val: `${categoryEntries.length} Active`,
      subtext: categorySummary || 'No categories',
      icon: Layers,
      iconBg: 'rgba(59, 130, 246, 0.1)',
      iconColor: '#3b82f6'
    },
    {
      label: 'Median Resolution',
      val: metrics.median_resolution_time,
      subtext: 'Creation to resolution',
      icon: Clock,
      iconBg: 'rgba(16, 185, 129, 0.1)',
      iconColor: '#10b981'
    },
    {
      label: 'AI Overrides',
      val: `${metrics.override_percentage}%`,
      subtext: `${metrics.override_count} of ${metrics.classified_count} overrode`,
      icon: UserCheck,
      iconBg: 'rgba(139, 92, 246, 0.1)',
      iconColor: '#8b5cf6'
    }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: '14px',
      marginBottom: '24px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div key={idx} style={{
            padding: '14px 16px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            minHeight: '104px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {card.label}
              </span>
              <div style={{
                padding: '6px',
                borderRadius: '6px',
                backgroundColor: card.iconBg,
                color: card.iconColor,
                display: 'flex',
                alignItems: 'center',
                justify: 'center'
              }}>
                <Icon size={16} />
              </div>
            </div>

            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.2,
              margin: '4px 0'
            }}>
              {card.val}
            </div>

            <div style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }} title={card.subtext}>
              {card.subtext}
            </div>
          </div>
        )
      })}
    </div>
  )
}
