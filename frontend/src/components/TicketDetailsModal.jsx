import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Sparkles, UserCheck, History } from 'lucide-react'

export default function TicketDetailsModal({ ticket, onClose, token, onTicketUpdated }) {
  const [tempCategory, setTempCategory] = useState('')
  const [tempPriority, setTempPriority] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])

  const fetchAuditLogs = async () => {
    if (!ticket?.id || !token) return
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/audit-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data)
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    }
  }

  useEffect(() => {
    if (ticket) {
      setTempCategory(ticket.category || ticket.ai_category || '')
      setTempPriority(ticket.priority || ticket.ai_priority || '')
      setReply('')
      setError(null)
      setSuccess(null)
      fetchAuditLogs()
    }
  }, [ticket])

  const hasChanges =
    tempCategory !== (ticket.category || ticket.ai_category || '') ||
    tempPriority !== (ticket.priority || ticket.ai_priority || '')

  const handleOverride = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category: tempCategory, priority: tempPriority })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to update ticket')
      }

      const updated = await res.json()
      onTicketUpdated(updated)
      setSuccess('Updated ticket overrides successfully.')
      fetchAuditLogs()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (e) => {
    e.preventDefault()
    if (!reply.trim()) return
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reply })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to resolve ticket')
      }

      const updated = await res.json()
      onTicketUpdated(updated)
      setReply('')
      setSuccess('Ticket resolved and response submitted successfully.')
      fetchAuditLogs()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{ticket.title}</h3>
            <p className="modal-subtitle">Ticket ID: {ticket.id}</p>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}>
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
              <strong style={{ fontSize: '13px' }}>{ticket.creator?.full_name || 'System'}</strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Submitted At</span>
              <strong style={{ fontSize: '13px' }}>{formatDate(ticket.created_at)}</strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Status</span>
              <span className={`badge ${ticket.status}`} style={{ width: 'fit-content' }}>{ticket.status}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">AI Classification</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                {ticket.ai_category ? (
                  <span className="badge ai-suggested">
                    <Sparkles size={11} />
                    <span style={{ textTransform: 'uppercase' }}>{ticket.ai_category}</span>
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None</span>
                )}

                {ticket.ai_priority && (
                  <span className={`badge ai-suggested prio-${ticket.ai_priority}`}>
                    <span style={{ textTransform: 'capitalize' }}>{ticket.ai_priority}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="description-section">
            <h4>Description</h4>
            <p style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
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
                View Attachment Reference
              </a>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0 }}>Triage Overrides</h4>
              <button
                onClick={handleOverride}
                className="btn-primary"
                disabled={!hasChanges || loading || ticket.status === 'resolved'}
                style={{
                  width: 'auto',
                  padding: '6px 14px',
                  fontSize: '12px',
                  opacity: (hasChanges && ticket.status !== 'resolved') ? 1 : 0.5,
                  cursor: (hasChanges && ticket.status !== 'resolved') ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease'
                }}
              >
                Apply Overrides
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="input-group">
                <label htmlFor="modal-category">Override Category</label>
                <select
                  id="modal-category"
                  className="select-filter"
                  style={{ width: '100%', padding: '10px' }}
                  value={tempCategory}
                  onChange={(e) => setTempCategory(e.target.value)}
                  disabled={loading || ticket.status === 'resolved'}
                >
                  <option value="">Select Category</option>
                  <option value="it">IT</option>
                  <option value="hr">HR</option>
                  <option value="finance">Finance</option>
                  <option value="admin">Admin</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="modal-priority">Override Priority</label>
                <select
                  id="modal-priority"
                  className="select-filter"
                  style={{ width: '100%', padding: '10px' }}
                  value={tempPriority}
                  onChange={(e) => setTempPriority(e.target.value)}
                  disabled={loading || ticket.status === 'resolved'}
                >
                  <option value="">Select Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resolution Reply Section */}
          <div className="resolution-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
            <h4>Resolution Reply</h4>

            {ticket.status === 'resolved' ? (
              <div className="resolution-box">
                <p className="resolver-info">
                  Resolved by {ticket.resolver?.full_name || 'Agent'} at {ticket.resolved_at ? formatDate(ticket.resolved_at) : ''}
                </p>
                <p className="reply-text">{ticket.final_reply}</p>
              </div>
            ) : (
              <div>
                <form onSubmit={handleResolve}>
                  <textarea
                    required
                    placeholder="Type final resolution reply here..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    disabled={loading}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      resize: 'vertical',
                      outline: 'none',
                      marginBottom: '12px'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ width: 'auto', padding: '10px 20px' }}
                      disabled={loading}
                    >
                      Submit Reply & Resolve
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Audit History Log Section (At the very bottom) */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
            <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={16} />
              <span>Audit History</span>
            </h4>

            {auditLogs.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                No manual overrides logged yet for this ticket.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditLogs.map(log => (
                  <div key={log.id} style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card, #f8fafc)',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div>
                      <strong>{log.agent?.full_name || 'Agent'}</strong> updated <code style={{ textTransform: 'capitalize', color: 'var(--primary)' }}>{log.field}</code> from <span style={{ textTransform: 'uppercase', color: 'var(--text-muted)' }}>{log.old_value || 'None'}</span> to <strong style={{ textTransform: 'uppercase' }}>{log.new_value}</strong>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
