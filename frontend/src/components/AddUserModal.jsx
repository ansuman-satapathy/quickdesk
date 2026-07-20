import { useState } from 'react'
import { AlertCircle } from 'lucide-react'

export default function AddUserModal({ onClose, token, onUserCreated }) {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.target)
    const fullName = formData.get('fullName')
    const email = formData.get('email')
    const password = formData.get('password')
    const role = formData.get('role')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to create user')
      }

      const newUser = await res.json()
      onUserCreated(newUser)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Create New User</h3>
          <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
        
        {error && (
          <div className="auth-alert error" style={{ margin: '20px 24px 0' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" style={{ padding: '24px' }}>
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '12px' }} disabled={loading}>
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  )
}
