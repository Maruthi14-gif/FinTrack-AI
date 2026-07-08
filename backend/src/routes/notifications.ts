import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getVapidKey,
  registerPush
} from '../controllers/notificationController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.get('/vapid-key', getVapidKey);
router.post('/register-push', registerPush);

export default router;
