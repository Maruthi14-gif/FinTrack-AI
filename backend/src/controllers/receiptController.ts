import { Request, Response } from 'express';
import Receipt from '../models/Receipt.js';
import { deleteReceiptImage } from '../services/receiptService.js';

// GET /api/receipts - all receipts for the logged-in user
export const getReceipts = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const receipts = await Receipt.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(receipts.map(r => ({ ...r.toObject(), id: r._id })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/receipts/:id - delete a receipt and its stored image
export const deleteReceipt = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.user.id });
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    deleteReceiptImage(receipt.imageUrl ?? undefined);

    await Receipt.deleteOne({ _id: req.params.id });
    res.json({ message: 'Receipt deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
