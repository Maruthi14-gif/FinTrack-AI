import { Request, Response } from 'express';
import Income from '../models/Income.js';
import { asString, escapeRegex, parsePagination, parseSort } from '../utils/query.js';

// GET /api/incomes - search, filtering, and pagination
export const getIncomes = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const search = asString(req.query.search);
    const category = asString(req.query.category);
    const startDate = asString(req.query.startDate);
    const endDate = asString(req.query.endDate);

    const query: any = { userId: req.user.id };

    if (search) query.source = { $regex: escapeRegex(search), $options: 'i' };
    if (category) query.category = category;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const { page: pageNum, limit: limitNum, skip: skipNum } = parsePagination(req.query);
    const sortObj = parseSort(req.query, ['date', 'amount', 'source', 'category', 'createdAt']);

    const totalCount = await Income.countDocuments(query);
    const incomes = await Income.find(query)
      .sort(sortObj)
      .skip(skipNum)
      .limit(limitNum);

    const mapped = incomes.map(inc => ({ ...inc.toObject(), id: inc._id }));

    res.json({
      incomes: mapped,
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

// POST /api/incomes - create a new income
export const createIncome = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { source, category, amount, date, description } = req.body;
    if (!source || !category || !amount || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newIncome = new Income({
      userId: req.user.id,
      source,
      category,
      amount,
      date,
      description: description || ''
    });

    await newIncome.save();
    res.status(201).json({ ...newIncome.toObject(), id: newIncome._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/incomes/:id
export const deleteIncome = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const deleted = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Income not found' });
    }

    res.json({ message: 'deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
