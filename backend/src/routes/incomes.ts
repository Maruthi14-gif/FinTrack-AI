import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getIncomes, createIncome, deleteIncome } from '../controllers/incomeController.js';

import { validateBody, validateObjectId } from '../middlewares/validate.js';
import { incomeSchema } from '../validators/schemas.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getIncomes);
router.post('/', validateBody(incomeSchema), createIncome);
router.delete('/:id', validateObjectId, deleteIncome);

export default router;
