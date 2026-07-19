import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, User, Mail, Shield, Plus, Ticket, RefreshCw } from 'lucide-react'

export default function EmployeeDashboard() {
  const { user, token, logout } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTickets = async () => {
    setError(null)
    try {
      const response = await fetch('/api/tickets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load tickets')
      }

      const data = await response.json()
      setTickets(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchTickets()
    }
  }, [token])

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: '580px' }}>
      <div className="dashboard-card glass">
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Employee Portal</h2>
            <p className="dashboard-subtitle">Manage your support requests</p>
          </div>
          <button onClick={logout} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '13px', width: 'auto', display: 'flex', gap: '6px' }}>
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>

        {/* User Info Collapse Panel */}
        <div className="profile-section" style={{ gap: '10px', marginBottom: '20px' }}>
          <div className="profile-row" style={{ padding: '10px', borderRadius: '10px', gap: '10px' }}>
            <User className="profile-icon" size={16} />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{user?.full_name}</span>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Tickets Section Header */}
        <div className="ticket-section-header">
          <h3>Your Tickets</h3>
          <Link to="/tickets/new" className="create-ticket-link">
            <Plus size={16} />
            <span>New Ticket</span>
          </Link>
        </div>

        {/* Tickets Content */}
        {loading ? (
          <div className="loading-screen" style={{ height: '120px' }}>
            <div className="spinner" style={{ width: '28px', height: '28px' }}></div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading your tickets...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'var(--error)', fontSize: '14px', marginBottom: '10px' }}>{error}</p>
            <button onClick={fetchTickets} className="btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px', display: 'inline-flex', gap: '6px' }}>
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="no-tickets">
            <Ticket size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px', opacity: 0.5 }} />
            <p>You haven't submitted any tickets yet.</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Click "New Ticket" to raise an IT or HR request.
            </p>
          </div>
        ) : (
          <div className="ticket-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="ticket-item">
                <div className="ticket-info">
                  <span className="ticket-title">{ticket.title}</span>
                  <span className="ticket-date">{formatDate(ticket.created_at)}</span>
                </div>
                <span className={`badge ${ticket.status}`}>
                  {ticket.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
