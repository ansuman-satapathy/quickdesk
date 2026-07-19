import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { RefreshCw, Search, Ticket, User, Calendar, Tag, Shield, Users, AlertCircle, CheckCircle2, Plus } from 'lucide-react'

export default function AdminDashboard() {
  const { token } = useAuth()
  
  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState('tickets') // 'tickets', 'users'
  
  // States
  const [tickets, setTickets] = useState([])
  const [usersList, setUsersList] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Search & Filters for Tickets
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
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

  // Search for Users
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch Tickets
      const ticketsRes = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      // 2. Fetch Users
      const usersRes = await fetch('/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!ticketsRes.ok || !usersRes.ok) {
        throw new Error('Failed to load admin panel data')
      }

      const ticketsData = await ticketsRes.json()
      const usersData = await usersRes.json()

      setTickets(ticketsData)
      setUsersList(usersData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchDashboardData()
    }
  }, [token])

  const handleUpdateRole = async (userId, newRole) => {
    setError(null)
    setActionSuccess(null)
    try {
      const res = await fetch(`/api/auth/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to update user role')
      }

      const updatedUser = await res.json()
      
      // Update local state
      setUsersList(prev => prev.map(u => u.id === userId ? updatedUser : u))
      setActionSuccess(`Successfully updated ${updatedUser.full_name}'s role to ${newRole}`)
      
      // Hide banner after 3 seconds
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setError(null)
    setActionSuccess(null)
    const formData = new FormData(e.target)
    const fullName = formData.get('fullName')
    const email = formData.get('email')
    const password = formData.get('password')
    const role = formData.get('role')

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to create user')
      }

      const newUser = await res.json()
      setUsersList(prev => [newUser, ...prev])
      setShowAddUserModal(false)
      setActionSuccess(`Successfully created user: ${newUser.full_name}`)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleOverride = async (updates) => {
    setError(null)
    setActionSuccess(null)
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
      setActionSuccess(`Updated ticket overrides successfully.`)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleResolve = async (replyText) => {
    setError(null)
    setActionSuccess(null)
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
      setActionSuccess(`Ticket resolved successfully.`)
      setTimeout(() => setActionSuccess(null), 3000)
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
        year: 'numeric'
      })
    } catch (e) {
      return dateStr
    }
  }

  // Filtered Tickets
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

  // Filtered Users
  const filteredUsers = usersList.filter(u => 
    u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  )

  return (
    <div className="dashboard-container" style={{ maxWidth: '1080px', flexDirection: 'column' }}>
      <div className="dashboard-card" style={{ width: '100%' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ textAlign: 'left' }}>
            <h2>Admin Control Center</h2>
            <p className="dashboard-subtitle">QuickDesk Super Administrator Panel</p>
          </div>
          <button onClick={fetchDashboardData} className="btn-secondary" style={{ width: 'auto', padding: '10px' }} title="Refresh Data">
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
        {actionSuccess && (
          <div className="auth-alert success" style={{ marginBottom: '20px' }}>
            <CheckCircle2 size={18} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Ticket size={16} />
              <span>System Queue</span>
            </div>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} />
              <span>Manage Users</span>
            </div>
          </button>
        </div>

        {/* Loader */}
        {loading ? (
          <div className="loading-screen" style={{ height: '240px' }}>
            <div className="spinner"></div>
            <p>Loading Admin Dashboard...</p>
          </div>
        ) : (
          <div>
            
            {/* View 1: System Queue */}
            {activeTab === 'tickets' && (
              <div>
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
                                {(!ticket.category && ticket.ai_category) && <span style={{ opacity: 0.6, fontSize: '11px', marginLeft: '4px' }}>✨</span>}
                              </td>
                              <td style={{ textTransform: 'capitalize' }}>
                                <span style={{ 
                                  color: displayPrio === 'high' ? '#ef4444' : 
                                         displayPrio === 'medium' ? '#3b82f6' : 'var(--text-secondary)'
                                }}>
                                  {displayPrio}
                                </span>
                                {(!ticket.priority && ticket.ai_priority) && <span style={{ opacity: 0.6, fontSize: '11px', marginLeft: '4px' }}>✨</span>}
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

            {/* View 2: User Management */}
            {activeTab === 'users' && (
              <div>
                <div className="filters-row" style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search users by name or email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                  <button 
                    onClick={() => setShowAddUserModal(true)} 
                    className="btn-primary" 
                    style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={16} />
                    <span>Add User</span>
                  </button>
                </div>

                <div className="users-grid">
                  {filteredUsers.map(userItem => (
                    <div key={userItem.id} className="user-card">
                      <div className="user-card-header">
                        <div>
                          <p className="user-card-name">{userItem.full_name}</p>
                          <p className="user-card-email">{userItem.email}</p>
                        </div>
                        <span className={`badge ${userItem.role}`}>
                          {userItem.role}
                        </span>
                      </div>
                      
                      <div className="user-card-meta">
                        <span>Joined: {formatDate(userItem.created_at)}</span>
                        <span style={{ fontSize: '11px', opacity: 0.6 }}>ID: {userItem.id}</span>
                      </div>

                      <div className="user-role-actions">
                        {userItem.role === 'employee' && (
                          <>
                            <button 
                              onClick={() => handleUpdateRole(userItem.id, 'agent')} 
                              className="btn-primary btn-small"
                              style={{ flex: 1 }}
                            >
                              Promote to Agent
                            </button>
                            <button 
                              onClick={() => handleUpdateRole(userItem.id, 'superadmin')} 
                              className="btn-secondary btn-small"
                              style={{ flex: 1 }}
                            >
                              Make Admin
                            </button>
                          </>
                        )}
                        
                        {userItem.role === 'agent' && (
                          <>
                            <button 
                              onClick={() => handleUpdateRole(userItem.id, 'employee')} 
                              className="btn-secondary btn-small"
                              style={{ flex: 1 }}
                            >
                              Make Employee
                            </button>
                            <button 
                              onClick={() => handleUpdateRole(userItem.id, 'superadmin')} 
                              className="btn-primary btn-small"
                              style={{ flex: 1 }}
                            >
                              Make Admin
                            </button>
                          </>
                        )}

                        {userItem.role === 'superadmin' && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                            Administrative access cannot be managed directly.
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Create New User</h3>
              <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowAddUserModal(false)}>
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="auth-form" style={{ padding: '24px' }}>
              <div className="input-group">
                <label htmlFor="fullName">Full Name</label>
                <div className="input-wrapper">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    style={{ paddingLeft: '14px' }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="e.g. jane@company.com"
                    style={{ paddingLeft: '14px' }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Temporary Password</label>
                <div className="input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    style={{ paddingLeft: '14px' }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="role">System Role</label>
                <div className="input-wrapper">
                  <select 
                    id="role" 
                    name="role" 
                    required 
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: '6px', 
                      border: '1px solid var(--border-color)', 
                      backgroundColor: '#ffffff',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  >
                    <option value="employee">Employee</option>
                    <option value="agent">Agent</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>
                Create User
              </button>
            </form>
          </div>
        </div>
      )}

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
              {actionSuccess && (
                <div className="auth-alert success" style={{ marginBottom: '20px' }}>
                  <CheckCircle2 size={18} />
                  <span>{actionSuccess}</span>
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
                  <a href={selectedTicket.attachment} target="_blank" rel="noopener noreferrer" className="create-ticket-link" style={{ fontSize: '13px' }}>
                    View Attached Resource
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
