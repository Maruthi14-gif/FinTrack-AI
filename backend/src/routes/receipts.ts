import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getReceipts, deleteReceipt } from '../controllers/receiptController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getReceipts);
router.delete('/:id', deleteReceipt);

export default router;
