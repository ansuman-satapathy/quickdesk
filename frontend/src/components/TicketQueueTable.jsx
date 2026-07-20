import { Ticket, Sparkles, UserCheck } from 'lucide-react'

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
              const isHumanCat = Boolean(ticket.category)
              const catValue = ticket.category || ticket.ai_category

              const isHumanPrio = Boolean(ticket.priority)
              const prioValue = ticket.priority || ticket.ai_priority

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
