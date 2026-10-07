import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getVapidKey,
  registerPush
} from '../controllers/notificationController.js';

import { validateBody, validateObjectId } from '../middlewares/validate.js';
import { pushSubscriptionSchema } from '../validators/schemas.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', validateObjectId, markAsRead);
router.get('/vapid-key', getVapidKey);
router.post('/register-push', validateBody(pushSubscriptionSchema), registerPush);

export default router;
