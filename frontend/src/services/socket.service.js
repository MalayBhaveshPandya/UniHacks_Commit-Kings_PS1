import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;
let connectionCount = 0; // Track how many components want the socket alive

/**
 * Singleton Socket.IO service for real-time chat.
 * Uses reference counting so React StrictMode double-mounts don't kill the connection.
 */
export const socketService = {
  /**
   * Connect to the Socket.IO server (if not already connected).
   * Increments reference count so multiple callers can share the connection.
   */
  connect() {
    connectionCount++;

    // Already connected or connecting — reuse
    if (socket) return socket;

    const token = localStorage.getItem('ps1_token');
    if (!token) {
      console.warn('Socket: No auth token found, skipping connection.');
      return null;
    }

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return socket;
  },

  /**
   * Decrement reference count; only truly disconnect when no one needs it.
   */
  disconnect() {
    connectionCount = Math.max(0, connectionCount - 1);
    if (connectionCount === 0 && socket) {
      socket.disconnect();
      socket = null;
    }
  },

  /**
   * Get the current socket instance (may be null if not connected).
   */
  getSocket() {
    return socket;
  },

  /**
   * Join a conversation room.
   * If the socket isn't connected yet, waits for the 'connect' event first.
   */
  joinRoom(conversationId) {
    if (!socket || !conversationId) return;
    if (socket.connected) {
      socket.emit('join_room', conversationId);
    } else {
      // Wait for socket to connect, then join
      socket.once('connect', () => {
        socket.emit('join_room', conversationId);
      });
    }
  },

  /**
   * Leave a conversation room.
   */
  leaveRoom(conversationId) {
    if (socket?.connected && conversationId) {
      socket.emit('leave_room', conversationId);
    }
  },

  /**
   * Listen for new messages from the server.
   * @param {function} callback - called with the new message object
   * @returns {function} unsubscribe function
   */
  onNewMessage(callback) {
    if (!socket) return () => { };
    // Capture socket reference in closure so cleanup is safe even after disconnect
    const s = socket;
    s.on('new_message', callback);
    return () => {
      try { s.off('new_message', callback); } catch (_) { /* already cleaned up */ }
    };
  },

  /**
   * Listen for typing indicators.
   * @param {function} callback
   * @returns {function} unsubscribe function
   */
  onTyping(callback) {
    if (!socket) return () => { };
    const s = socket;
    s.on('display_typing', callback);
    return () => {
      try { s.off('display_typing', callback); } catch (_) { /* already cleaned up */ }
    };
  },

  /**
   * Emit typing event.
   */
  emitTyping(conversationId) {
    if (socket?.connected) {
      socket.emit('typing', { room: conversationId });
    }
  },
};
