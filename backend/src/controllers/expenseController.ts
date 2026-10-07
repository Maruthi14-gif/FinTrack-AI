import { Request, Response } from 'express';
import Expense from '../models/Expense.js';
import { parseExpense } from '../services/aiService.js';
import { checkBudgetLimit, checkSpendingAnomaly } from '../services/alertService.js';
import { asString, asNumber, escapeRegex, parsePagination, parseSort } from '../utils/query.js';

// GET /api/expenses - search, filtering, sorting, and pagination
export const getExpenses = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const search = asString(req.query.search);
    const category = asString(req.query.category);
    const startDate = asString(req.query.startDate);
    const endDate = asString(req.query.endDate);
    const minAmount = asNumber(req.query.minAmount);
    const maxAmount = asNumber(req.query.maxAmount);

    const query: any = { userId: req.user.id };

    if (search) query.item = { $regex: escapeRegex(search), $options: 'i' };
    if (category) query.category = category;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      query.amount = {};
      if (minAmount !== undefined) query.amount.$gte = minAmount;
      if (maxAmount !== undefined) query.amount.$lte = maxAmount;
    }

    const { page: pageNum, limit: limitNum, skip: skipNum } = parsePagination(req.query);
    const sortObj = parseSort(req.query, ['date', 'amount', 'item', 'category', 'createdAt']);

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
};

// POST /api/expenses - create a new expense
export const createExpense = async (req: Request, res: Response): Promise<any> => {
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
    checkSpendingAnomaly(req.user.id, category);
    res.status(201).json({ ...newExpense.toObject(), id: newExpense._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/expenses/parse - parse natural language text and save the expenses
export const parseAndCreateExpenses = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Ignore anything the parser could not attach a real amount to.
    const parsedExpenses = (await parseExpense(text)).filter(exp => exp.amount > 0);
    if (parsedExpenses.length === 0) {
      return res.status(422).json({ error: 'Could not find an amount in that. Try something like "spent 250 on groceries".' });
    }
    const savedExpenses = [];

    for (const exp of parsedExpenses) {
      const newExpense = new Expense({
        ...exp,
        userId: req.user.id
      });
      await newExpense.save();
      checkBudgetLimit(req.user.id, exp.category);
      checkSpendingAnomaly(req.user.id, exp.category);
      savedExpenses.push({ ...newExpense.toObject(), id: newExpense._id });
    }

    res.status(201).json({
      message: 'Parsed and saved successfully',
      expenses: savedExpenses
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to parse expense' });
  }
};

// DELETE /api/expenses/:id
export const deleteExpense = async (req: Request, res: Response): Promise<any> => {
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
};
