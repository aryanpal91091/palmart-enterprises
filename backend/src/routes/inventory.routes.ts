import { Router } from 'express';
import { getInventoryLogs, adjustStock, transferStock, getInventoryAlerts } from '../controllers/inventory.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/logs', authenticateJWT, getInventoryLogs);
router.get('/alerts', authenticateJWT, getInventoryAlerts);
router.post('/adjust', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), adjustStock);
router.post('/transfer', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), transferStock);

export default router;
