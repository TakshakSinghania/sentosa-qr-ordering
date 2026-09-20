import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config/env.js';
import { initRealtime } from './services/realtime.js';
import router from './routes/index.js';
import { prisma } from './utils/prisma.js';

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend client
const allowedOrigins = Array.from(
  new Set([
    config.appUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    ...config.allowedOrigins,
  ])
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Capture raw body buffer for cryptographically exact Razorpay webhook signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'qr-cafe-backend',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Mount Main API Routes
app.use('/api', router);

// Initialize Realtime WebSockets
initRealtime(server, config.appUrl, config.allowedOrigins);

// Start HTTP Server (in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port} (${config.nodeEnv})`);
    console.log(`📡 API available at: ${config.apiUrl}/api`);
    console.log(`💻 Frontend expected at: ${config.appUrl}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('HTTP server closed & Prisma disconnected');
  });
});

export { app, server };
