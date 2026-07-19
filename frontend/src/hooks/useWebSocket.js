import { useEffect, useRef } from 'react'

export default function useWebSocket({ onTicketCreated, onTicketUpdated, onTicketResolved }) {
  const callbacksRef = useRef({ onTicketCreated, onTicketUpdated, onTicketResolved })
  callbacksRef.current = { onTicketCreated, onTicketUpdated, onTicketResolved }

  useEffect(() => {
    let ws = null
    let reconnectTimeout = null
    let reconnectAttempt = 0
    let unmounted = false
    const maxReconnectDelay = 30000

    function connect() {
      if (unmounted) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.hostname === '0.0.0.0' ? 'localhost' : window.location.hostname
      const port = window.location.port ? `:${window.location.port}` : ''
      const wsUrl = `${protocol}//${host}${port}/ws/tickets`

      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        reconnectAttempt = 0
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const { event: eventType, ticket } = data
          const cbs = callbacksRef.current

          if (eventType === 'ticket_created' && cbs.onTicketCreated) {
            cbs.onTicketCreated(ticket)
          } else if (eventType === 'ticket_updated' && cbs.onTicketUpdated) {
            cbs.onTicketUpdated(ticket)
          } else if (eventType === 'ticket_resolved' && cbs.onTicketResolved) {
            cbs.onTicketResolved(ticket)
          }
        } catch (err) {
          // Ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (unmounted) return
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), maxReconnectDelay)
        reconnectAttempt += 1
        reconnectTimeout = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    const initTimeout = setTimeout(connect, 100)

    return () => {
      unmounted = true
      clearTimeout(initTimeout)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (ws) ws.close()
    }
  }, [])
}
