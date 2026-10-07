import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getDebts, createDebt, deleteDebt, getPayoffPlan } from '../controllers/debtController.js';

import { validateBody, validateObjectId } from '../middlewares/validate.js';
import { debtSchema } from '../validators/schemas.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getDebts);
router.post('/', validateBody(debtSchema), createDebt);
router.delete('/:id', validateObjectId, deleteDebt);
router.get('/plan', getPayoffPlan);

export default router;
