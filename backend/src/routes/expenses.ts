import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getExpenses, createExpense, parseAndCreateExpenses, deleteExpense } from '../controllers/expenseController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getExpenses);
router.post('/', createExpense);
router.post('/parse', parseAndCreateExpenses);
router.delete('/:id', deleteExpense);

export default router;
