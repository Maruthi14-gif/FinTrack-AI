import { Request, Response } from 'express';
import Subscription from '../models/Subscription.js';
import { checkUpcomingBills } from '../services/alertService.js';

// GET /api/subscriptions - list subscriptions and run the upcoming-bill alert scan
export const getSubscriptions = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const list = await Subscription.find({ userId: req.user.id }).sort({ createdAt: -1 });

    await checkUpcomingBills(req.user.id, list);

    res.json(list.map(s => ({ ...s.toObject(), id: s._id })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/subscriptions
export const createSubscription = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, amount, category, billingCycle, nextDueDate } = req.body;
    if (!name || amount === undefined || !category || !nextDueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newSub = new Subscription({
      userId: req.user.id,
      name,
      amount,
      category,
      billingCycle: billingCycle || 'monthly',
      nextDueDate
    });

    await newSub.save();
    res.status(201).json({ ...newSub.toObject(), id: newSub._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/subscriptions/:id/toggle - toggle status (active/paused)
export const toggleSubscription = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const sub = await Subscription.findOne({ _id: req.params.id, userId: req.user.id });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    sub.status = sub.status === 'active' ? 'paused' : 'active';
    await sub.save();

    res.json({ ...sub.toObject(), id: sub._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/subscriptions/:id
export const deleteSubscription = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const deleted = await Subscription.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ message: 'deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
