import { Router } from 'express';
import { createPurchaseOrder, getPurchaseOrders, getPurchaseOrderById, receivePurchaseOrder } from '../controllers/purchase.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateJWT, getPurchaseOrders);
router.get('/:id', authenticateJWT, getPurchaseOrderById);
router.post('/', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), createPurchaseOrder);
router.put('/:id/receive', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), receivePurchaseOrder);

export default router;
