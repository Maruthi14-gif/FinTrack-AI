import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getDistribution,
  getInsights,
  getSpendingSummary,
  getMonthlyTrend,
  getDailyTrend,
  getSpendingAnomalies,
  getFinancialHealth
} from '../controllers/analyticsController.js';

const router = Router();
router.use(authMiddleware);

router.get('/distribution', getDistribution);
router.get('/insights', getInsights);
router.get('/summary', getSpendingSummary);
router.get('/monthly-trend', getMonthlyTrend);
router.get('/daily-trend', getDailyTrend);
router.get('/anomalies', getSpendingAnomalies);
router.get('/health', getFinancialHealth);

export default router;
