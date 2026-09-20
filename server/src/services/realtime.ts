import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initRealtime(httpServer: HTTPServer, clientOrigin: string, extraOrigins: string[] = []) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [clientOrigin, 'http://localhost:5173', 'http://localhost:3000', ...extraOrigins],
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Restaurant Staff Room
    socket.on('join:restaurant', (restaurantId: string) => {
      if (restaurantId) {
        socket.join(`restaurant:${restaurantId}`);
      }
    });

    // Customer Order Tracking Room
    socket.on('join:order', (orderToken: string) => {
      if (orderToken) {
        socket.join(`order:${orderToken}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function notifyNewOrder(restaurantId: string, orderData: any) {
  if (io) {
    io.to(`restaurant:${restaurantId}`).emit('order:new', orderData);
  }
}

export function notifyOrderStatusChanged(
  restaurantId: string,
  orderToken: string,
  orderData: any
) {
  if (io) {
    // Notify kitchen dashboard
    io.to(`restaurant:${restaurantId}`).emit('order:status_updated', orderData);
    // Notify customer phone
    io.to(`order:${orderToken}`).emit('order:status_updated', orderData);
  }
}

export function notifyMenuUpdated(restaurantId: string) {
  if (io) {
    io.to(`restaurant:${restaurantId}`).emit('menu:updated');
  }
}

export function notifyWaiterRequested(restaurantId: string, requestData: any) {
  if (io) {
    io.to(`restaurant:${restaurantId}`).emit('waiter:new', requestData);
  }
}

export function notifyWaiterStatusUpdated(restaurantId: string, requestData: any) {
  if (io) {
    io.to(`restaurant:${restaurantId}`).emit('waiter:status_updated', requestData);
  }
}

