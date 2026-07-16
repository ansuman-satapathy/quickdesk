import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setHealth(data))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="app">
      <div className="logo-container">
        <svg
          className="logo-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="10" r="2" />
        </svg>
        <h1>QuickDesk</h1>
      </div>
      <p className="subtitle">AI-Assisted Internal Helpdesk</p>

      <div className="status-card">
        <h2>Backend Connection</h2>
        {error && <p className="status error">✗ Disconnected — {error}</p>}
        {health && (
          <div>
            <p className="status connected">✓ Connected</p>
            <ul>
              <li><strong>Service:</strong> {health.service}</li>
              <li><strong>Status:</strong> {health.status}</li>
              <li><strong>Version:</strong> {health.version}</li>
            </ul>
          </div>
        )}
        {!health && !error && <p className="status loading">Connecting...</p>}
      </div>
    </div>
  )
}

export default App
