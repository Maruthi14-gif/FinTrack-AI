import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getSubscriptions,
  createSubscription,
  toggleSubscription,
  deleteSubscription
} from '../controllers/subscriptionController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getSubscriptions);
router.post('/', createSubscription);
router.put('/:id/toggle', toggleSubscription);
router.delete('/:id', deleteSubscription);

export default router;
