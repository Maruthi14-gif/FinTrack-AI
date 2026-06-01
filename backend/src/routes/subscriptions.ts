import { Router, Request, Response } from 'express';
import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// GET /api/subscriptions - Get all subscriptions and run alerts check
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const list = await Subscription.find({ userId: req.user.id }).sort({ createdAt: -1 });

    // Run upcoming bill alerts scanner
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSubs = list.filter(sub => sub.status === 'active');

    for (const sub of activeSubs) {
      if (!sub.nextDueDate) continue;
      const dueDate = new Date(sub.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 3) {
        const existingAlert = await Notification.findOne({
          userId: req.user.id,
          type: 'debt_due',
          title: { $regex: new RegExp(sub.name, 'i') },
          message: { $regex: new RegExp(sub.nextDueDate, 'i') }
        });

        if (!existingAlert) {
          const newNotification = new Notification({
            userId: req.user.id,
            title: `Upcoming Bill: ${sub.name}`,
            message: `Reminder: Your subscription for ${sub.name} (₹${sub.amount.toLocaleString()}) is due on ${sub.nextDueDate} (in ${diffDays === 0 ? 'today' : diffDays === 1 ? '1 day' : diffDays + ' days'}).`,
            type: 'debt_due'
          });
          await newNotification.save();
        }
      }
    }

    res.json(list.map(s => ({ ...s.toObject(), id: s._id })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions - Create subscription
router.post('/', async (req: Request, res: Response): Promise<any> => {
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
});

// PUT /api/subscriptions/:id/toggle - Toggle subscription status (active/paused)
router.put('/:id/toggle', async (req: Request, res: Response): Promise<any> => {
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
});

// DELETE /api/subscriptions/:id - Delete subscription
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
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
});

export default router;
