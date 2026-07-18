import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = localStorage.getItem('qd_token')
      if (!savedToken) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${savedToken}`,
          },
        })

        if (response.ok) {
          const userData = await response.json()
          setToken(savedToken)
          setUser(userData)
        } else {
          // Token expired or invalid
          localStorage.removeItem('qd_token')
        }
      } catch (err) {
        console.error('Error restoring auth session:', err)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  // Login action
  const login = async (email, password) => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed')
      }

      // Save token to localStorage
      localStorage.setItem('qd_token', data.access_token)
      setToken(data.access_token)

      // Fetch current user details
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      })

      if (!userResponse.ok) {
        throw new Error('Failed to retrieve user profile')
      }

      const userData = await userResponse.json()
      setUser(userData)
      return userData
    } catch (err) {
      localStorage.removeItem('qd_token')
      setToken(null)
      setUser(null)
      throw err;
    } finally {
      setLoading(false)
    }
  }

  // Logout action
  const logout = () => {
    localStorage.removeItem('qd_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to consume the AuthContext easily
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
