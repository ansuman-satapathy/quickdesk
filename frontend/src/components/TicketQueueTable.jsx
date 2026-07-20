import { useState } from 'react'
import { Ticket, Sparkles, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react'

export default function TicketQueueTable({ tickets, selectedTicketId, onSelectTicket }) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

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

  const totalPages = Math.ceil(tickets.length / pageSize) || 1
  const startIndex = (currentPage - 1) * pageSize
  const paginatedTickets = tickets.slice(startIndex, startIndex + pageSize)

  return (
    <div className="queue-table-wrapper" style={{ margin: 0 }}>
      {tickets.length === 0 ? (
        <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>
          <Ticket size={32} style={{ marginBottom: '8px', opacity: 0.5, display: 'inline-block' }} />
          <p>No tickets matching the current filters.</p>
        </div>
      ) : (
        <>
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
              {paginatedTickets.map(ticket => {
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

          {/* Pagination Bar */}
          {tickets.length > 0 && (
            <div style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color)',
              fontSize: '13px',
              color: 'var(--text-muted)',
              backgroundColor: '#fafafa'
            }}>
              <span style={{ fontWeight: 500, marginRight: '24px' }}>
                Showing <strong style={{ color: 'var(--text-main)' }}>{startIndex + 1}</strong> to <strong style={{ color: 'var(--text-main)' }}>{Math.min(startIndex + pageSize, tickets.length)}</strong> of <strong style={{ color: 'var(--text-main)' }}>{tickets.length}</strong> tickets
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary"
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    width: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>
                
                <span style={{ fontWeight: 500, color: 'var(--text-main)', padding: '0 4px' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    width: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
