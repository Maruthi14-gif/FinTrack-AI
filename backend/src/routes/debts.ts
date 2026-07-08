import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getDebts, createDebt, deleteDebt, getPayoffPlan } from '../controllers/debtController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getDebts);
router.post('/', createDebt);
router.delete('/:id', deleteDebt);
router.get('/plan', getPayoffPlan);

export default router;
