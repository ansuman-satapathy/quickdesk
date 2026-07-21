import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import TicketDetailsModal from '../components/TicketDetailsModal'
import TicketFilterBar from '../components/TicketFilterBar'
import TicketQueueTable from '../components/TicketQueueTable'
import MetricsDashboard from '../components/MetricsDashboard'
import useWebSocket from '../hooks/useWebSocket'

export default function AgentDashboard() {
  const { token } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [metricsTrigger, setMetricsTrigger] = useState(0)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState(null)

  const refreshMetrics = () => setMetricsTrigger(prev => prev + 1)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const ticketsResponse = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!ticketsResponse.ok) {
        throw new Error('Failed to load queue dashboard data')
      }

      const ticketsData = await ticketsResponse.json()
      setTickets(ticketsData)
      refreshMetrics()
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

  useWebSocket({
    onTicketCreated: (ticket) => {
      setTickets(prev => [ticket, ...prev])
      refreshMetrics()
    },
    onTicketUpdated: (ticket) => {
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t))
      setSelectedTicket(prev => (prev?.id === ticket.id ? ticket : prev))
      refreshMetrics()
    },
    onTicketResolved: (ticket) => {
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t))
      setSelectedTicket(prev => (prev?.id === ticket.id ? ticket : prev))
      refreshMetrics()
    }
  })

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

  return (
    <div className="dashboard-container" style={{ maxWidth: '100%', flexDirection: 'column' }}>
      <div className="dashboard-card" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ textAlign: 'left' }}>
            <h2>Agent Workspace</h2>
            <p className="dashboard-subtitle">QuickDesk Support Staff Queue</p>
          </div>
          <button onClick={fetchData} className="btn-secondary" style={{ width: 'auto', padding: '10px' }} title="Refresh Queue">
            <RefreshCw size={16} />
          </button>
        </div>

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

        {/* Real-time Analytics & Metrics Component */}
        <MetricsDashboard token={token} refreshTrigger={metricsTrigger} />

        {loading ? (
          <div className="loading-screen">
            <div className="spinner"></div>
            <p>Loading Ticket Queue...</p>
          </div>
        ) : (
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
      </div>

      {selectedTicket && (
        <TicketDetailsModal 
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          token={token}
          onTicketUpdated={(updatedTicket) => {
            setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t))
            setSelectedTicket(updatedTicket)
            refreshMetrics()
          }}
        />
      )}
    </div>
  )
}
