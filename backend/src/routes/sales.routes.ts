import { Router } from 'express';
import { createSale, getSales, getSaleById, returnSale } from '../controllers/sales.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.post('/', authenticateJWT, createSale);
router.get('/', authenticateJWT, getSales);
router.get('/:id', authenticateJWT, getSaleById);
router.post('/return', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), returnSale);

export default router;
