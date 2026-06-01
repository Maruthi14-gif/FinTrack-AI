import { Router, Request, Response } from 'express';
import Expense from '../models/Expense.js';
import Budget from '../models/Budget.js';
import Notification from '../models/Notification.js';
import { parseExpense } from '../services/aiService.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

async function checkBudgetLimit(userId: string, category: string) {
  try {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);

    // 1. Check if there is a budget for this user and category
    const budget = await Budget.findOne({ userId, category });
    if (!budget) return;

    // 2. Fetch total spent in this category for the current month
    const categoryExpenses = await Expense.find({
      userId,
      category,
      date: { $regex: `^${currentMonth}` }
    });
    const totalSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);

    const budgetLimit = budget.monthly_limit;
    const ratio = totalSpent / budgetLimit;

    // We only trigger alerts if ratio >= 0.9
    if (ratio >= 0.9) {
      // Check if we already triggered an alert today for this category to avoid spam
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const existingAlert = await Notification.findOne({
        userId,
        type: 'budget_alert',
        title: { $regex: new RegExp(category, 'i') },
        createdAt: { $gte: startOfToday }
      });

      if (!existingAlert) {
        let title = '';
        let message = '';
        if (ratio >= 1.0) {
          title = `Budget Exceeded: ${category}`;
          message = `Alert! You have spent ₹${totalSpent.toLocaleString()} on ${category}, exceeding your limit of ₹${budgetLimit.toLocaleString()} by ${Math.round((ratio - 1) * 100)}%.`;
        } else {
          title = `Budget Warning: ${category}`;
          message = `Warning: You have used ${Math.round(ratio * 100)}% of your monthly ${category} budget limit (Spent ₹${totalSpent.toLocaleString()} of ₹${budgetLimit.toLocaleString()}).`;
        }

        const newNotification = new Notification({
          userId,
          title,
          message,
          type: 'budget_alert'
        });
        await newNotification.save();
      }
    }
  } catch (err) {
    console.error('Error triggering budget alert notifications:', err);
  }
}

// Get expenses with search, filtering, sorting, and pagination
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { search, category, startDate, endDate, sortBy, sortOrder, page, limit } = req.query;

    const query: any = { userId: req.user.id };

    if (search) {
      query.item = { $regex: search, $options: 'i' };
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    const sortField = (sortBy as string) || 'date';
    const sortDir = (sortOrder as string) === 'asc' ? 1 : -1;
    const sortObj: any = {};
    sortObj[sortField] = sortDir;
    
    // Fallback tie-breaker sort
    if (sortField !== '_id') {
      sortObj._id = -1;
    }

    const totalCount = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .sort(sortObj)
      .skip(skipNum)
      .limit(limitNum);

    const mapped = expenses.map(e => ({ ...e.toObject(), id: e._id }));

    res.json({
      expenses: mapped,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalItems: totalCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new expense
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { item, category, amount, date, description, receiptId } = req.body;
    if (!item || !category || !amount || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newExpense = new Expense({
      userId: req.user.id,
      item,
      category,
      amount,
      date,
      description: description || '',
      receiptId: receiptId || null
    });

    await newExpense.save();
    checkBudgetLimit(req.user.id, category);
    res.status(201).json({ ...newExpense.toObject(), id: newExpense._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Parse natural language expense text
router.post('/parse', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const parsedExpenses = await parseExpense(text);
    const savedExpenses = [];

    for (const exp of parsedExpenses) {
      const newExpense = new Expense({
        ...exp,
        userId: req.user.id
      });
      await newExpense.save();
      checkBudgetLimit(req.user.id, exp.category);
      savedExpenses.push({ ...newExpense.toObject(), id: newExpense._id });
    }

    res.status(201).json({
      message: 'Parsed and saved successfully',
      expenses: savedExpenses
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to parse expense' });
  }
});

// Delete an expense
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const deleted = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
