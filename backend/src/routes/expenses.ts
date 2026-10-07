import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getExpenses, createExpense, parseAndCreateExpenses, deleteExpense } from '../controllers/expenseController.js';

import { validateBody, validateObjectId } from '../middlewares/validate.js';
import { aiLimiter } from '../middlewares/rateLimiters.js';
import { expenseSchema, parseExpenseSchema } from '../validators/schemas.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getExpenses);
router.post('/', validateBody(expenseSchema), createExpense);
router.post('/parse', aiLimiter, validateBody(parseExpenseSchema), parseAndCreateExpenses);
router.delete('/:id', validateObjectId, deleteExpense);

export default router;
