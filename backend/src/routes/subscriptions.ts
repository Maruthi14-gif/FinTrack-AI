import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getSubscriptions,
  createSubscription,
  toggleSubscription,
  deleteSubscription
} from '../controllers/subscriptionController.js';

import { validateBody, validateObjectId } from '../middlewares/validate.js';
import { subscriptionSchema } from '../validators/schemas.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getSubscriptions);
router.post('/', validateBody(subscriptionSchema), createSubscription);
router.put('/:id/toggle', validateObjectId, toggleSubscription);
router.delete('/:id', validateObjectId, deleteSubscription);

export default router;
