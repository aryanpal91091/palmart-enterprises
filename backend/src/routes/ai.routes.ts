import { Router } from 'express';
import {
  getForecasts,
  getRecommendations,
  getCustomerSegmentation,
  getBillingAnomalies,
  handleChatQuery,
} from '../controllers/ai.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/forecasts', authenticateJWT, getForecasts);
router.get('/recommendations', authenticateJWT, getRecommendations);
router.get('/segmentation', authenticateJWT, getCustomerSegmentation);
router.get('/anomalies', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), getBillingAnomalies);
router.post('/chat', authenticateJWT, handleChatQuery);

export default router;
