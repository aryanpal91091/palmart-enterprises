import { Router } from 'express';
import { getSettings, updateSettings, backupDatabase, restoreDatabase } from '../controllers/settings.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateJWT, getSettings);
router.put('/', authenticateJWT, requireRole([Role.ADMIN]), updateSettings);
router.get('/backup', authenticateJWT, requireRole([Role.ADMIN]), backupDatabase);
router.post('/restore', authenticateJWT, requireRole([Role.ADMIN]), restoreDatabase);

export default router;
