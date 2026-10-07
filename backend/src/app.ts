// Builds the Express app (middleware + routes) without starting it.
// Kept separate from server.ts so tests can import the app directly.
import path from 'path';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import env from './config/env.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

import authRoutes from './routes/auth.js';
import expensesRoutes from './routes/expenses.js';
import analyticsRoutes from './routes/analytics.js';
import budgetsRoutes from './routes/budgets.js';
import aiRoutes from './routes/ai.js';
import incomesRoutes from './routes/incomes.js';
import debtsRoutes from './routes/debts.js';
import notificationsRoutes from './routes/notifications.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import receiptsRoutes from './routes/receipts.js';

const app = express();

// Render (and most hosts) put the app behind a proxy; this makes req.ip correct.
app.set('trust proxy', 1);

// Only the frontends listed in CLIENT_URL may call the API from a browser.
// Requests with no Origin header (health checks, curl, mobile apps) are allowed.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientUrls.includes(origin.replace(/\/+$/, ''))) {
        callback(null, true);
      } else {
        callback(Object.assign(new Error(`Origin ${origin} is not allowed by CORS`), { status: 403 }));
      }
    }
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'FinTrack AI API', status: 'active', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/incomes', incomesRoutes);
app.use('/api/debts', debtsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/receipts', receiptsRoutes);

app.use('/api', notFound);
app.use(errorHandler);

export default app;
