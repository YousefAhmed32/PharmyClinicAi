require('dotenv').config();

const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION — shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const startServer = async () => {
  await connectDB();
  const httpServer = http.createServer(app);
  const io = initSocket(httpServer);
  app.set('io', io);
  global._io = io; // accessible from services

  httpServer.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║        PharmaClinic API Server               ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Mode    : ${NODE_ENV.padEnd(34)}║`);
    console.log(`║  Port    : ${String(PORT).padEnd(34)}║`);
    console.log(`║  API     : http://localhost:${PORT}/api/health  ║`);
    console.log(`║  WS      : ws://localhost:${PORT}               ║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
  });

  process.on('unhandledRejection', (err) => {
    console.error('❌ UNHANDLED REJECTION — shutting down...');
    console.error(err.name, err.message);
    httpServer.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received — graceful shutdown...');
    httpServer.close(() => {
      console.log('✅ Process terminated');
      process.exit(0);
    });
  });
};

startServer();
