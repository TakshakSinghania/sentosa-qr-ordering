import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const wsTarget = import.meta.env.VITE_WS_URL || '/';
    socket = io(wsTarget, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Realtime WebSocket server');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Realtime WebSocket server');
    });
  }

  return socket;
}
