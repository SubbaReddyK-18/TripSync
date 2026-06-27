import { io } from 'socket.io-client'

let socket = null

export function connectSocket(token) {
  if (socket?.connected) return socket

  const url = import.meta.env.VITE_SOCKET_URL || window.location.origin
  socket = io(url, {
    query: { token },
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected')
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

export function joinTripRoom(tripId) {
  if (socket?.connected) {
    socket.emit('join_trip', { trip_id: tripId })
  }
}

export function leaveTripRoom(tripId) {
  if (socket?.connected) {
    socket.emit('leave_trip', { trip_id: tripId })
  }
}

export function onTripEvent(event, callback) {
  if (socket) {
    socket.on(event, callback)
  }
}

export function offTripEvent(event, callback) {
  if (socket) {
    socket.off(event, callback)
  }
}

export function getSocket() {
  return socket
}
