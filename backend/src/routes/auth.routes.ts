import { Router } from 'express';
import { login, refreshToken, forgotPassword, resetPassword, getMe } from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticateJWT, getMe);

export default router;
