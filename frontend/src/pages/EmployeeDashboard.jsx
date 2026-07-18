import { useAuth } from '../context/AuthContext'
import { LogOut, User, Mail, Shield } from 'lucide-react'

export default function EmployeeDashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="dashboard-container">
      <div className="dashboard-card glass">
        <div className="dashboard-header">
          <h2>Employee Dashboard</h2>
          <p className="dashboard-subtitle">Welcome back to QuickDesk support</p>
        </div>

        <div className="profile-section">
          <div className="profile-row">
            <User className="profile-icon" size={20} />
            <div>
              <span className="profile-label">Name</span>
              <p className="profile-value">{user?.full_name}</p>
            </div>
          </div>

          <div className="profile-row">
            <Mail className="profile-icon" size={20} />
            <div>
              <span className="profile-label">Email</span>
              <p className="profile-value">{user?.email}</p>
            </div>
          </div>

          <div className="profile-row">
            <Shield className="profile-icon" size={20} />
            <div>
              <span className="profile-label">Role</span>
              <p className="profile-value capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        <button onClick={logout} className="btn-secondary logout-btn">
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  )
}
