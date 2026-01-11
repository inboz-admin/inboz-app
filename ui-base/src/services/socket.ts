import { io, Socket } from 'socket.io-client';

// Get base URL without /api/v1 or /api
const getBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
  // Remove /api/v1 or /api from the end
  return apiUrl.replace(/\/api\/v1$/, '').replace(/\/api$/, '') || 'http://localhost:3000';
};

const WS_URL = getBaseUrl();

let socket: Socket | null = null;

/**
 * Get or create WebSocket connection
 */
export const getSocket = (): Socket => {
  if (!socket) {
    console.log('🔌 Initializing WebSocket connection to:', WS_URL);
    
    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket?.id);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, need to reconnect manually
        socket?.connect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ WebSocket reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed after all attempts');
    });
  }

  return socket;
};

/**
 * Disconnect WebSocket
 */
export const disconnectSocket = () => {
  if (socket) {
    console.log('🔌 Disconnecting WebSocket');
    socket.disconnect();
    socket = null;
  }
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};

