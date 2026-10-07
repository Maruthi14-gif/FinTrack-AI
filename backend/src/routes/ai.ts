import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { chat, query, summary, parseReceipt } from '../controllers/aiController.js';

import { validateBody } from '../middlewares/validate.js';
import { aiLimiter } from '../middlewares/rateLimiters.js';
import { chatSchema, querySchema, receiptScanSchema } from '../validators/schemas.js';

const router = Router();
router.use(authMiddleware);
router.use(aiLimiter);

router.post('/chat', validateBody(chatSchema), chat);
router.post('/query', validateBody(querySchema), query);
router.get('/summary', summary);
router.post('/parse-receipt', validateBody(receiptScanSchema), parseReceipt);

export default router;
