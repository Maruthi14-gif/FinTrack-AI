import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getIncomes, createIncome, deleteIncome } from '../controllers/incomeController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getIncomes);
router.post('/', createIncome);
router.delete('/:id', deleteIncome);

export default router;
