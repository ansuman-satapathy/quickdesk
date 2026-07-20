import { useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function EditUserModal({ user, onClose, token, onUserUpdated }) {
  const [fullName, setFullName] = useState(user.full_name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const payload = {
      full_name: fullName,
      email: email,
      role: role
    }

    if (password.trim()) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }
      payload.password = password
    }

    try {
      const response = await fetch(`/api/auth/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to update user')
      }

      const updatedUser = await response.json()
      setSuccess('User updated successfully!')
      setTimeout(() => {
        onUserUpdated(updatedUser)
        onClose()
      }, 1000)
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
          <div>
            <h3>Edit User</h3>
            <p className="modal-subtitle">ID: {user.id}</p>
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={onClose}>
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ gap: '16px' }}>
            {error && (
              <div className="auth-alert error" style={{ marginBottom: 0 }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="auth-alert success" style={{ marginBottom: 0 }}>
                <CheckCircle2 size={18} />
                <span>{success}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="edit-fullname">Full Name</label>
              <input
                id="edit-fullname"
                type="text"
                className="search-input"
                style={{ width: '100%' }}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="edit-email">Email Address</label>
              <input
                id="edit-email"
                type="email"
                className="search-input"
                style={{ width: '100%' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="edit-role">Role</label>
              <select
                id="edit-role"
                className="select-filter"
                style={{ width: '100%' }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={user.role === 'superadmin'}
              >
                <option value="employee">Employee</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="edit-password">Password (Optional)</label>
              <input
                id="edit-password"
                type="password"
                className="search-input"
                style={{ width: '100%' }}
                placeholder="Leave blank to keep unchanged"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
