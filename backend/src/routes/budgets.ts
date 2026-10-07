import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getBudgets, upsertBudget, getBudgetStatus } from '../controllers/budgetController.js';

import { validateBody } from '../middlewares/validate.js';
import { budgetSchema } from '../validators/schemas.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getBudgets);
router.post('/', validateBody(budgetSchema), upsertBudget);
router.get('/status', getBudgetStatus);

export default router;
