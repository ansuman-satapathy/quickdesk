import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Register from './pages/Register'
import Login from './pages/Login'
import EmployeeDashboard from './pages/EmployeeDashboard'
import NewTicket from './pages/NewTicket'
import AgentDashboard from './pages/AgentDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected employee dashboard */}
        <Route 
          path="/employee" 
          element={
            <ProtectedRoute allowedRoles={['employee']}>
              <DashboardLayout>
                <EmployeeDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Protected employee ticket creation */}
        <Route 
          path="/tickets/new" 
          element={
            <ProtectedRoute allowedRoles={['employee']}>
              <DashboardLayout>
                <NewTicket />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Protected agent dashboard */}
        <Route 
          path="/agent" 
          element={
            <ProtectedRoute allowedRoles={['agent']}>
              <DashboardLayout>
                <AgentDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Protected admin dashboard */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <DashboardLayout>
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        
        {/* Default route redirects to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Fallback redirects to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
