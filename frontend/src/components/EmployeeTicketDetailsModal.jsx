export default function EmployeeTicketDetailsModal({ ticket, onClose }) {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{ticket.title}</h3>
            <p className="modal-subtitle">Ticket ID: {ticket.id}</p>
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          <div className="meta-grid">
            <div className="meta-item">
              <span className="meta-label">Status</span>
              <span className={`badge ${ticket.status}`} style={{ width: 'fit-content' }}>
                {ticket.status}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Category</span>
              <strong style={{ textTransform: 'capitalize', fontSize: '13px' }}>
                {(ticket.category || ticket.ai_category || 'unassigned').replace('_', ' ')}
                {(!ticket.category && ticket.ai_category) && <span style={{ opacity: 0.6, fontSize: '11px', marginLeft: '4px' }}>✨</span>}
              </strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Priority</span>
              <strong style={{ textTransform: 'capitalize', fontSize: '13px' }}>
                {ticket.priority || ticket.ai_priority || 'unassigned'}
                {(!ticket.priority && ticket.ai_priority) && <span style={{ opacity: 0.6, fontSize: '11px', marginLeft: '4px' }}>✨</span>}
              </strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Submitted At</span>
              <strong style={{ fontSize: '13px' }}>{formatDate(ticket.created_at)}</strong>
            </div>
          </div>

          <div className="description-section">
            <h4>Description</h4>
            <p>{ticket.description}</p>
          </div>

          {ticket.attachment && (
            <div className="attachment-section">
              <h4>Attachment</h4>
              <a
                href={ticket.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="create-ticket-link"
                style={{ fontSize: '13px' }}
              >
                View Attached Resource
              </a>
            </div>
          )}

          <div className="resolution-section">
            <h4>Resolution Reply</h4>
            {ticket.status === 'resolved' ? (
              <div className="resolution-box">
                <p className="resolver-info">
                  Resolved at {ticket.resolved_at ? formatDate(ticket.resolved_at) : 'N/A'}
                </p>
                <p className="reply-text">{ticket.final_reply}</p>
              </div>
            ) : (
              <p className="no-resolution">This ticket is currently open and awaiting agent assignment.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
