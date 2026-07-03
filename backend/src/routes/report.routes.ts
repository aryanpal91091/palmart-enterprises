import { Router } from 'express';
import { getDashboardStats, downloadInvoicePDF } from '../controllers/report.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/dashboard-stats', authenticateJWT, getDashboardStats);
router.get('/invoice/:id/pdf', authenticateJWT, downloadInvoicePDF);

export default router;
