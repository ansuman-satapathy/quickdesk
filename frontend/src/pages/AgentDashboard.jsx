import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { RefreshCw, Search, Ticket, User, Calendar, Tag, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function AgentDashboard() {
  const { token } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  
  // Selected Ticket for modal view
  const [selectedTicket, setSelectedTicket] = useState(null)

  // Temporary overrides for Category/Priority in modal
  const [tempCategory, setTempCategory] = useState('')
  const [tempPriority, setTempPriority] = useState('')

  useEffect(() => {
    if (selectedTicket) {
      setTempCategory(selectedTicket.category || selectedTicket.ai_category || '')
      setTempPriority(selectedTicket.priority || selectedTicket.ai_priority || '')
    }
  }, [selectedTicket])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch Tickets
      const ticketsResponse = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!ticketsResponse.ok) {
        throw new Error('Failed to load queue dashboard data')
      }

      const ticketsData = await ticketsResponse.json()
      setTickets(ticketsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token])

  const handleOverride = async (updates) => {
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to update ticket')
      }

      const updatedTicket = await res.json()
      
      setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t))
      setSelectedTicket(updatedTicket)
      setSuccess(`Updated ticket overrides successfully.`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleResolve = async (replyText) => {
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reply: replyText })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to resolve ticket')
      }

      const updatedTicket = await res.json()
      
      setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t))
      setSelectedTicket(updatedTicket)
      setSuccess(`Ticket resolved and response submitted successfully.`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return dateStr
    }
  }

  // Filter logic
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    
    const currentPriority = ticket.priority || ticket.ai_priority
    const matchesPriority = priorityFilter === 'all' || currentPriority === priorityFilter
    
    const currentCategory = ticket.category || ticket.ai_category
    const matchesCategory = categoryFilter === 'all' || currentCategory === categoryFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory
  })

  const hasChanges = selectedTicket && (
    tempCategory !== (selectedTicket.category || selectedTicket.ai_category || '') ||
    tempPriority !== (selectedTicket.priority || selectedTicket.ai_priority || '')
  )

  return (
    <div className="dashboard-container" style={{ maxWidth: '1080px', flexDirection: 'column' }}>
      <div className="dashboard-card" style={{ width: '100%' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ textAlign: 'left' }}>
            <h2>Agent Workspace</h2>
            <p className="dashboard-subtitle">QuickDesk Support Staff Queue</p>
          </div>
          <button onClick={fetchData} className="btn-secondary" style={{ width: 'auto', padding: '10px' }} title="Refresh Queue">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Action Status Banners */}
        {error && (
          <div className="auth-alert error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-alert success" style={{ marginBottom: '20px' }}>
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-screen">
            <div className="spinner"></div>
            <p>Loading Ticket Queue...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Search & Filters */}
            <div className="filters-row">
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search tickets..."
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

              <select className="select-filter" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <select className="select-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                <option value="it">IT</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
                <option value="admin">Admin</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Queue Table */}
            <div className="queue-table-wrapper" style={{ margin: 0 }}>
              {filteredTickets.length === 0 ? (
                <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <Ticket size={32} style={{ marginBottom: '8px', opacity: 0.5, display: 'inline-block' }} />
                  <p>No tickets matching the current filters.</p>
                </div>
              ) : (
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Submitted By</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map(ticket => {
                      const displayPrio = ticket.priority || ticket.ai_priority || 'unassigned'
                      const displayCat = ticket.category || ticket.ai_category || 'unassigned'
                      return (
                        <tr 
                          key={ticket.id} 
                          onClick={() => setSelectedTicket(ticket)}
                          className={selectedTicket?.id === ticket.id ? 'selected' : ''}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ fontWeight: 600 }}>{ticket.title}</td>
                          <td>
                            <span className={`badge ${ticket.status}`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>
                            {displayCat.replace('_', ' ')}
                            {(!ticket.category && ticket.ai_category) && <span style={{ opacity: 0.6, fontSize: '11px', marginLeft: '4px' }} title="AI Classified">✨</span>}
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>
                            <span style={{ 
                              color: displayPrio === 'high' ? '#ef4444' : 
                                     displayPrio === 'medium' ? '#3b82f6' : 'var(--text-secondary)'
                            }}>
                              {displayPrio}
                            </span>
                            {(!ticket.priority && ticket.ai_priority) && <span style={{ opacity: 0.6, fontSize: '11px', marginLeft: '4px' }} title="AI Classified">✨</span>}
                          </td>
                          <td>{ticket.creator?.full_name || 'System'}</td>
                          <td>{formatDate(ticket.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <div>
                <h3>{selectedTicket.title}</h3>
                <p className="modal-subtitle">Ticket ID: {selectedTicket.id}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}>
                Close
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: 'left' }}>
              {error && (
                <div className="auth-alert error" style={{ marginBottom: '20px' }}>
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="auth-alert success" style={{ marginBottom: '20px' }}>
                  <CheckCircle2 size={18} />
                  <span>{success}</span>
                </div>
              )}
              
              <div className="meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Submitted By</span>
                  <strong style={{ fontSize: '13px' }}>{selectedTicket.creator?.full_name || 'System'}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Submitted At</span>
                  <strong style={{ fontSize: '13px' }}>{formatDate(selectedTicket.created_at)}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Status</span>
                  <span className={`badge ${selectedTicket.status}`} style={{ width: 'fit-content' }}>{selectedTicket.status}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">AI Auto-Category</span>
                  <strong style={{ fontSize: '13px', textTransform: 'capitalize' }}>
                    {selectedTicket.ai_category?.replace('_', ' ') || 'None'}
                  </strong>
                </div>
              </div>

              <div className="description-section">
                <h4>Description</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</p>
              </div>

              {selectedTicket.attachment && (
                <div className="attachment-section">
                  <h4>Attachment</h4>
                  <a 
                    href={selectedTicket.attachment} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="create-ticket-link"
                    style={{ fontSize: '13px' }}
                  >
                    View Attachment Reference
                  </a>
                </div>
              )}

              {/* Triage settings */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0 }}>Triage Overrides</h4>
                  <button 
                    onClick={() => handleOverride({ category: tempCategory, priority: tempPriority })}
                    className="btn-primary"
                    disabled={!hasChanges}
                    style={{ 
                      width: 'auto', 
                      padding: '6px 14px', 
                      fontSize: '12px', 
                      opacity: hasChanges ? 1 : 0.5, 
                      cursor: hasChanges ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Apply Overrides
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  
                  {/* Category select */}
                  <div className="input-group">
                    <label htmlFor="modal-category">Override Category</label>
                    <select 
                      id="modal-category"
                      className="select-filter" 
                      style={{ width: '100%', padding: '10px' }}
                      value={tempCategory}
                      onChange={(e) => setTempCategory(e.target.value)}
                    >
                      <option value="">Select Category</option>
                      <option value="it">IT</option>
                      <option value="hr">HR</option>
                      <option value="finance">Finance</option>
                      <option value="admin">Admin</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Priority select */}
                  <div className="input-group">
                    <label htmlFor="modal-priority">Override Priority</label>
                    <select 
                      id="modal-priority"
                      className="select-filter" 
                      style={{ width: '100%', padding: '10px' }}
                      value={tempPriority}
                      onChange={(e) => setTempPriority(e.target.value)}
                    >
                      <option value="">Select Priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* Resolution Area */}
              <div className="resolution-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
                <h4>Resolution Reply</h4>
                
                {selectedTicket.status === 'resolved' ? (
                  <div className="resolution-box">
                    <p className="resolver-info">
                      Resolved by {selectedTicket.resolver?.full_name || 'Agent'} at {selectedTicket.resolved_at ? formatDate(selectedTicket.resolved_at) : ''}
                    </p>
                    <p className="reply-text">{selectedTicket.final_reply}</p>
                  </div>
                ) : (
                  <div>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.target)
                      const reply = formData.get('reply')
                      if (reply && reply.trim()) {
                        handleResolve(reply)
                        e.target.reset()
                      }
                    }}>
                      <div className="input-wrapper" style={{ display: 'block' }}>
                        <textarea 
                          name="reply"
                          placeholder="Type final resolution reply here..."
                          required
                          style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                        />
                      </div>
                      <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: '12px' }}>
                        Submit Reply & Resolve
                      </button>
                    </form>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  )
}
