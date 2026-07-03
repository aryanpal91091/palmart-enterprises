import { Router } from 'express';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  markAttendance,
  getAttendance,
  getLeaves,
  applyLeave,
  updateLeaveStatus,
} from '../controllers/employee.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Employee info (only Admin/Manager can view employees)
router.get('/', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), getEmployees);
router.post('/', authenticateJWT, requireRole([Role.ADMIN]), createEmployee);
router.put('/:id', authenticateJWT, requireRole([Role.ADMIN]), updateEmployee);
router.delete('/:id', authenticateJWT, requireRole([Role.ADMIN]), deleteEmployee);

// Attendance routes
router.get('/attendance', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), getAttendance);
router.post('/attendance/mark', authenticateJWT, markAttendance);

// Leaves routes
router.get('/leaves', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), getLeaves);
router.post('/leaves/apply', authenticateJWT, applyLeave);
router.put('/leaves/:id/status', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), updateLeaveStatus);

export default router;
