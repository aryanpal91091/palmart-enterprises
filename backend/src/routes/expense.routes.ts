import { Router } from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expense.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateJWT, getExpenses);
router.post('/', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), createExpense);
router.put('/:id', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), updateExpense);
router.delete('/:id', authenticateJWT, requireRole([Role.ADMIN]), deleteExpense);

export default router;
