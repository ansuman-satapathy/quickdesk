import { Search } from 'lucide-react'

export default function TicketFilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  categoryFilter,
  onCategoryChange
}) {
  return (
    <div className="filters-row">
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          className="search-input"
          placeholder="Search ticket title or description..." 
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ paddingLeft: '38px' }}
        />
      </div>

      <select className="select-filter" value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
        <option value="all">All Statuses</option>
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
      </select>

      <select className="select-filter" value={priorityFilter} onChange={(e) => onPriorityChange(e.target.value)}>
        <option value="all">All Priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <select className="select-filter" value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)}>
        <option value="all">All Categories</option>
        <option value="it">IT</option>
        <option value="hr">HR</option>
        <option value="finance">Finance</option>
        <option value="admin">Admin</option>
        <option value="other">Other</option>
      </select>
    </div>
  )
}
