import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogOut, Terminal } from 'lucide-react'

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Flat Sticky Top Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 24px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}>
        {/* Solid Color Logo and Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'var(--primary)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <Terminal size={18} />
          </div>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '18px',
            letterSpacing: '-0.5px',
            color: 'var(--primary)'
          }}>
            QuickDesk
          </span>
        </div>

        {/* Profile Dropdown */}
        {user && (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '9999px',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{user.full_name}</span>
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '220px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                padding: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 100
              }}>
                <div style={{ padding: '4px 8px 8px 8px', borderBottom: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                  <span className={`badge ${user.role}`} style={{ 
                    marginTop: '6px', 
                    fontSize: '10px', 
                    padding: '2px 6px',
                    border: 'none',
                    display: 'inline-flex'
                  }}>
                    {user.role}
                  </span>
                </div>
                
                <button 
                  onClick={logout} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--error)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    textAlign: 'left',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '30px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
