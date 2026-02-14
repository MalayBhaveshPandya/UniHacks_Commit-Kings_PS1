import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/**
 * Singleton Socket.IO service for real-time chat.
 */
export const socketService = {
  /**
   * Connect to the Socket.IO server (if not already connected).
   * Must be called after the user is authenticated.
   */
  connect() {
    if (socket?.connected) return socket;

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
   * Disconnect from the Socket.IO server.
   */
  disconnect() {
    if (socket) {
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
   */
  joinRoom(conversationId) {
    if (socket?.connected && conversationId) {
      socket.emit('join_room', conversationId);
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
    socket.on('new_message', callback);
    return () => socket.off('new_message', callback);
  },

  /**
   * Listen for typing indicators.
   * @param {function} callback
   * @returns {function} unsubscribe function
   */
  onTyping(callback) {
    if (!socket) return () => { };
    socket.on('display_typing', callback);
    return () => socket.off('display_typing', callback);
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
