import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, AlertCircle, CheckCircle2, Send, Paperclip } from 'lucide-react'

export default function NewTicket() {
  const { token } = useAuth()
  const navigate = useNavigate()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          attachment: attachment.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to submit ticket')
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/employee')
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card glass">
        <div className="dashboard-header" style={{ position: 'relative' }}>
          <Link to="/employee" className="create-ticket-link" style={{ position: 'absolute', left: 0, top: '4px' }}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </Link>
          <h2 style={{ marginTop: '36px' }}>Submit Request</h2>
          <p className="dashboard-subtitle">Let us know how we can help you</p>
        </div>

        {error && (
          <div className="auth-alert error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-alert success">
            <CheckCircle2 size={18} />
            <span>Ticket submitted successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="title">Subject / Title</label>
            <div className="input-wrapper">
              <input
                id="title"
                type="text"
                required
                placeholder="e.g. Cannot connect to VPN"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading || success}
                style={{ paddingLeft: '14px' }} // overriding left icon padding
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="description">Detailed Description</label>
            <div className="input-wrapper">
              <textarea
                id="description"
                required
                placeholder="Please describe your issue in detail. If it's a specific system, please name it."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="attachment">Attachment Link (Optional)</label>
            <div className="input-wrapper">
              <Paperclip className="input-icon" size={18} />
              <input
                id="attachment"
                type="text"
                placeholder="e.g. https://imgur.com/screenshot.png"
                value={attachment}
                onChange={(e) => setAttachment(e.target.value)}
                disabled={loading || success}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading || success || !title.trim() || !description.trim()}>
            {loading ? 'Submitting...' : 'Submit Ticket'}
            {!loading && <Send size={18} className="btn-icon" />}
          </button>
        </form>
      </div>
    </div>
  )
}
