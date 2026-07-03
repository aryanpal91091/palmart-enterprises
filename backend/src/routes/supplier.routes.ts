import { Router } from 'express';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplier.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateJWT, getSuppliers);
router.get('/:id', authenticateJWT, getSupplierById);
router.post('/', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), createSupplier);
router.put('/:id', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), updateSupplier);
router.delete('/:id', authenticateJWT, requireRole([Role.ADMIN]), deleteSupplier);

export default router;
