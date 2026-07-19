import { Ticket } from 'lucide-react'

export default function TicketQueueTable({ tickets, selectedTicketId, onSelectTicket }) {
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

  return (
    <div className="queue-table-wrapper" style={{ margin: 0 }}>
      {tickets.length === 0 ? (
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
            {tickets.map(ticket => {
              const displayPrio = ticket.priority || ticket.ai_priority || 'unassigned'
              const displayCat = ticket.category || ticket.ai_category || 'unassigned'
              return (
                <tr 
                  key={ticket.id} 
                  onClick={() => onSelectTicket(ticket)}
                  className={selectedTicketId === ticket.id ? 'selected' : ''}
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
  )
}
