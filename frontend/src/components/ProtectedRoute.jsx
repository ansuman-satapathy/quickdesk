import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Verifying session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    let redirectPath = '/employee'
    if (user.role === 'agent') {
      redirectPath = '/agent'
    } else if (user.role === 'superadmin') {
      redirectPath = '/admin'
    }
    return <Navigate to={redirectPath} replace />
  }


  return children
}
