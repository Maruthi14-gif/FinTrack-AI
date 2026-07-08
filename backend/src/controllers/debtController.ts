import { Request, Response } from 'express';
import Debt from '../models/Debt.js';
import { buildPayoffPlan } from '../services/debtPlanService.js';

// GET /api/debts
export const getDebts = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const debts = await Debt.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(debts.map(d => ({ ...d.toObject(), id: d._id })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/debts - create a new debt
export const createDebt = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, principalAmount, remainingBalance, interestRate, emi, dueDate } = req.body;
    if (!name || principalAmount === undefined || remainingBalance === undefined || interestRate === undefined || emi === undefined || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newDebt = new Debt({
      userId: req.user.id,
      name,
      principalAmount,
      remainingBalance,
      interestRate,
      emi,
      dueDate
    });

    await newDebt.save();
    res.status(201).json({ ...newDebt.toObject(), id: newDebt._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/debts/:id
export const deleteDebt = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const deleted = await Debt.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    res.json({ message: 'deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/debts/plan - payoff projections (Snowball vs Avalanche)
export const getPayoffPlan = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const debts = await Debt.find({ userId: req.user.id });
    if (debts.length === 0) {
      return res.json({ snowball: null, avalanche: null, hasDebts: false });
    }

    const extraPayment = parseFloat(req.query.extraPayment as string) || 0;
    const { snowball, avalanche } = buildPayoffPlan(debts, extraPayment);

    res.json({
      hasDebts: true,
      extraPayment,
      snowball,
      avalanche
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
