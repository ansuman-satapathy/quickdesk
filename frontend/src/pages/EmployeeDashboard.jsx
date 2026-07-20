import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Plus, Ticket, RefreshCw, Search, Sparkles, UserCheck } from 'lucide-react'
import EmployeeTicketDetailsModal from '../components/EmployeeTicketDetailsModal'
import useWebSocket from '../hooks/useWebSocket'

export default function EmployeeDashboard() {
  const { token } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState(null)

  const fetchTickets = async () => {
    setLoading(true)
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

  useWebSocket({
    onTicketUpdated: (ticket) => setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t)),
    onTicketResolved: (ticket) => setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t))
  })

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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="dashboard-container" style={{ maxWidth: '1080px', flexDirection: 'column' }}>
      <div className="dashboard-card" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ textAlign: 'left' }}>
            <h2>Employee Portal</h2>
            <p className="dashboard-subtitle">Manage your support requests</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/tickets/new" className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px' }}>
              <Plus size={16} />
              <span>New Ticket</span>
            </Link>
            <button onClick={fetchTickets} className="btn-secondary" style={{ width: 'auto', padding: '10px' }} title="Refresh Tickets">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="filters-row" style={{ marginBottom: '24px' }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="search-input"
              placeholder="Search your tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <select className="select-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ height: '200px' }}>
            <div className="spinner"></div>
            <p>Loading your tickets...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--error)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
            <button onClick={fetchTickets} className="btn-secondary" style={{ width: 'auto', padding: '10px 20px', display: 'inline-flex', gap: '8px' }}>
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: '60px', color: 'var(--text-muted)', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
            <Ticket size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5, display: 'inline-block' }} />
            <p style={{ fontWeight: 500 }}>No tickets found</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {tickets.length === 0 ? 'Click "New Ticket" to raise an IT or HR request.' : 'Try adjusting your search query or status filter.'}
            </p>
          </div>
        ) : (
          <div className="queue-table-wrapper">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => {
                  const isHumanCat = Boolean(ticket.category)
                  const catValue = ticket.category || ticket.ai_category

                  const isHumanPrio = Boolean(ticket.priority)
                  const prioValue = ticket.priority || ticket.ai_priority

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600 }}>{ticket.title}</td>
                      <td>
                        <span className={`badge ${ticket.status}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>
                        {catValue ? (
                          <span className={`badge ${isHumanCat ? 'override' : 'ai-suggested'}`}>
                            {isHumanCat ? <UserCheck size={12} /> : <Sparkles size={12} />}
                            <span style={{ textTransform: 'uppercase' }}>{catValue}</span>
                          </span>
                        ) : (
                          <span className="badge ai-processing" title="AI is classifying ticket in background...">
                            <Sparkles size={11} className="spin-icon" />
                            <span>AI Analyzing...</span>
                          </span>
                        )}
                      </td>
                      <td>
                        {prioValue ? (
                          <span className={`badge ${isHumanPrio ? 'override' : 'ai-suggested'} prio-${prioValue}`}>
                            {isHumanPrio ? <UserCheck size={12} /> : <Sparkles size={12} />}
                            <span style={{ textTransform: 'capitalize' }}>{prioValue}</span>
                          </span>
                        ) : (
                          <span className="badge ai-processing" title="AI is classifying ticket in background...">
                            <Sparkles size={11} className="spin-icon" />
                            <span>AI Analyzing...</span>
                          </span>
                        )}
                      </td>
                      <td>{formatDate(ticket.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTicket && (
        <EmployeeTicketDetailsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  )
}
