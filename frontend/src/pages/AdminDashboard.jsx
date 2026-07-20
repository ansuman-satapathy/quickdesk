import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { RefreshCw, Search, Shield, Users, Plus, AlertCircle, CheckCircle2, Ticket } from 'lucide-react'
import TicketDetailsModal from '../components/TicketDetailsModal'
import AddUserModal from '../components/AddUserModal'
import EditUserModal from '../components/EditUserModal'
import TicketFilterBar from '../components/TicketFilterBar'
import TicketQueueTable from '../components/TicketQueueTable'
import useWebSocket from '../hooks/useWebSocket'

import MetricsDashboard from '../components/MetricsDashboard'

export default function AdminDashboard() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('tickets')
  const [tickets, setTickets] = useState([])
  const [usersList, setUsersList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [metricsTrigger, setMetricsTrigger] = useState(0)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState(null)

  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const refreshMetrics = () => setMetricsTrigger(prev => prev + 1)

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const ticketsRes = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
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
      refreshMetrics()
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

  useWebSocket({
    onTicketCreated: (ticket) => {
      setTickets(prev => [ticket, ...prev])
      refreshMetrics()
    },
    onTicketUpdated: (ticket) => {
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t))
      refreshMetrics()
    },
    onTicketResolved: (ticket) => {
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t))
      refreshMetrics()
    }
  })

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

  // Filtered Users (excluding superadmin from the list)
  const filteredUsers = usersList.filter(u =>
    u.role !== 'superadmin' &&
    (u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
     u.email.toLowerCase().includes(userSearchTerm.toLowerCase()))
  )

  return (
    <div className="dashboard-container" style={{ maxWidth: '100%', flexDirection: 'column' }}>
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

        {/* Real-time Analytics & Metrics */}
        <MetricsDashboard token={token} refreshTrigger={metricsTrigger} />

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <TicketFilterBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  priorityFilter={priorityFilter}
                  onPriorityChange={setPriorityFilter}
                  categoryFilter={categoryFilter}
                  onCategoryChange={setCategoryFilter}
                />

                <TicketQueueTable
                  tickets={filteredTickets}
                  selectedTicketId={selectedTicket?.id}
                  onSelectTicket={setSelectedTicket}
                />
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

                <div className="queue-table-wrapper">
                  <table className="queue-table">
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(userItem => (
                        <tr key={userItem.id} style={{ cursor: 'default' }}>
                          <td style={{ fontWeight: 600 }}>{userItem.full_name}</td>
                          <td>{userItem.email}</td>
                          <td>
                            <span className={`badge ${userItem.role}`}>
                              {userItem.role}
                            </span>
                          </td>
                          <td>{formatDate(userItem.created_at)}</td>
                          <td>
                            {userItem.role === 'superadmin' ? (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Readonly
                              </span>
                            ) : (
                              <button
                                onClick={() => setEditingUser(userItem)}
                                className="btn-secondary btn-small"
                                style={{ padding: '6px 12px', width: 'auto' }}
                              >
                                Edit User
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          token={token}
          onUserCreated={(newUser) => {
            setUsersList(prev => [newUser, ...prev])
            setActionSuccess(`Successfully created user: ${newUser.full_name}`)
            setTimeout(() => setActionSuccess(null), 3000)
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          token={token}
          onUserUpdated={(updatedUser) => {
            setUsersList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
          }}
        />
      )}

      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          token={token}
          onTicketUpdated={(updatedTicket) => {
            setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t))
            setSelectedTicket(updatedTicket)
          }}
        />
      )}

    </div>
  )
}
