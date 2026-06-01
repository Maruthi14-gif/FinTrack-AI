import { Router, Request, Response } from 'express';
import Receipt from '../models/Receipt.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(authMiddleware);

// GET /api/receipts - Get all receipts for the logged-in user
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const receipts = await Receipt.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(receipts.map(r => ({ ...r.toObject(), id: r._id })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/receipts/:id - Delete a specific receipt
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.user.id });
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Attempt to delete physical file from disk
    if (receipt.imageUrl && receipt.imageUrl.startsWith('/uploads/')) {
      const filename = receipt.imageUrl.replace(/^\/uploads\//, '');
      const filepath = path.join(process.cwd(), 'public/uploads', filename);
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (fsErr) {
        console.error(`Failed to delete physical receipt image file at ${filepath}:`, fsErr);
      }
    }

    await Receipt.deleteOne({ _id: req.params.id });
    res.json({ message: 'Receipt deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
