import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';

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

connectDB();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

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

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Financial Recovery Assistant API',
    status: 'active',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
