import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getReceipts, deleteReceipt } from '../controllers/receiptController.js';

import { validateObjectId } from '../middlewares/validate.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getReceipts);
router.delete('/:id', validateObjectId, deleteReceipt);

export default router;
