import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { chat, query, summary, parseReceipt } from '../controllers/aiController.js';

const router = Router();
router.use(authMiddleware);

router.post('/chat', chat);
router.post('/query', query);
router.get('/summary', summary);
router.post('/parse-receipt', parseReceipt);

export default router;
