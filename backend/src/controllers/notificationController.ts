import { Request, Response } from 'express';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';

// GET /api/notifications
export const getNotifications = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const list = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(list.map(n => ({ ...n.toObject(), id: n._id })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ ...updated.toObject(), id: updated._id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/notifications/read-all
export const markAllAsRead = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/notifications/vapid-key - public VAPID key for the push subscription
export const getVapidKey = async (req: Request, res: Response): Promise<any> => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ error: 'VAPID key not initialized' });
    }
    res.json({ publicKey });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/notifications/register-push - register a Web Push subscription
export const registerPush = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Valid subscription object is required' });
    }

    const existing = await PushSubscription.findOne({
      userId: req.user.id,
      'subscription.endpoint': subscription.endpoint
    });

    if (existing) {
      return res.json({ message: 'Push subscription already registered' });
    }

    const newSub = new PushSubscription({
      userId: req.user.id,
      subscription
    });

    await newSub.save();
    res.status(201).json({ message: 'Push subscription registered successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
