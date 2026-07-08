import { Request, Response } from 'express';
import Income from '../models/Income.js';

// GET /api/incomes - search, filtering, and pagination
export const getIncomes = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { search, category, startDate, endDate, sortBy, sortOrder, page, limit } = req.query;

    const query: any = { userId: req.user.id };

    if (search) {
      query.source = { $regex: search, $options: 'i' };
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

    if (sortField !== '_id') {
      sortObj._id = -1;
    }

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
