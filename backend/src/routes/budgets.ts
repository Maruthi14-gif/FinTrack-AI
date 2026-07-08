import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getBudgets, upsertBudget, getBudgetStatus } from '../controllers/budgetController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getBudgets);
router.post('/', upsertBudget);
router.get('/status', getBudgetStatus);

export default router;
