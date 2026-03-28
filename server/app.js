const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const requestLogger = require('./middlewares/requestLogger');
const { generalLimiter } = require('./middlewares/rateLimiter');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const apiRouter = require('./routes/index');
const imageRoutes = require('./routes/image');

const app = express();

app.use('/api/images', imageRoutes);
// ─── Security Headers ──────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploaded images
  })
);

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, mobile apps, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin '${origin}' not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── HTTP Logger ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// ─── Rate Limiter ──────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Static Files (uploaded images) ───────────────────────────────────────
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    maxAge: '7d',
    etag: true,
  })
);

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use(notFound);

// ─── Global Error Handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
