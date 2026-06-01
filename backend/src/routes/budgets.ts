import { Router, Request, Response } from 'express';
import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

// Get all budgets for the authenticated user
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const budgets = await Budget.find({ userId: req.user.id });
    res.json(budgets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Set or update a budget for a category
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { category, monthly_limit } = req.body;
    if (!category || monthly_limit === undefined) {
      return res.status(400).json({ error: 'Missing category or monthly limit' });
    }

    const budget = await Budget.findOneAndUpdate(
      { userId: req.user.id, category },
      { monthly_limit },
      { new: true, upsert: true }
    );

    res.json({
      message: 'Budget saved',
      category: budget.category,
      monthly_limit: budget.monthly_limit
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get budget status for current month
router.get('/status', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const currentMonth = new Date().toISOString().slice(0, 7);

    const budgets = await Budget.find({ userId: req.user.id });
    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $regex: `^${currentMonth}` }
    });

    // Calculate spent per category
    const spentByCategory = expenses.reduce((acc: { [key: string]: number }, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    const status = budgets.map(b => ({
      category: b.category,
      monthly_limit: b.monthly_limit,
      spent: spentByCategory[b.category] || 0
    }));

    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
