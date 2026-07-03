import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Role, AttendanceStatus, LeaveStatus, LeaveType } from '@prisma/client';

export const getEmployees = async (req: Request, res: Response, next: NextFunction) => {
  const { search } = req.query;

  try {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ employees });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { name, email, password, role } = req.body;

  try {
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'An employee with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const employee = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role as Role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'EMPLOYEE_CREATE',
          details: `Provisioned account for ${name} (${email}) as ${role}`,
        },
      });
    }

    return res.status(201).json({ message: 'Employee account created successfully', employee });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, email, password, role, isActive } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role as Role;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const employee = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'EMPLOYEE_UPDATE',
          details: `Updated details for Employee ID ${id}`,
        },
      });
    }

    return res.status(200).json({ message: 'Employee updated successfully', employee });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'EMPLOYEE_DISABLE',
          details: `Disabled Employee ID ${id}`,
        },
      });
    }

    return res.status(200).json({ message: 'Employee account disabled' });
  } catch (error) {
    next(error);
  }
};

// Attendance Logic
export const markAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { employeeId, type } = req.body; // type: 'CHECK_IN' or 'CHECK_OUT'

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const empId = employeeId || req.user?.id;

    if (!empId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    if (type === 'CHECK_IN') {
      // Check if already checked in today
      const existing = await prisma.attendance.findFirst({
        where: {
          employeeId: empId,
          date: {
            gte: today,
          },
        },
      });

      if (existing) {
        return res.status(400).json({ message: 'Employee already checked in for today' });
      }

      const attendance = await prisma.attendance.create({
        data: {
          employeeId: empId,
          checkIn: new Date(),
          date: today,
          status: 'PRESENT',
        },
      });

      return res.status(201).json({ message: 'Checked in successfully', attendance });
    } else {
      // Check out
      const attendanceRecord = await prisma.attendance.findFirst({
        where: {
          employeeId: empId,
          date: {
            gte: today,
          },
          checkOut: null,
        },
      });

      if (!attendanceRecord) {
        return res.status(400).json({ message: 'No active check-in session found for today' });
      }

      const attendance = await prisma.attendance.update({
        where: { id: attendanceRecord.id },
        data: {
          checkOut: new Date(),
        },
      });

      return res.status(200).json({ message: 'Checked out successfully', attendance });
    }
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attendance = await prisma.attendance.findMany({
      include: {
        employee: { select: { name: true, email: true, role: true } },
      },
      orderBy: { date: 'desc' },
      take: 50,
    });
    return res.status(200).json({ attendance });
  } catch (error) {
    next(error);
  }
};

// Leaves API
export const getLeaves = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leaves = await prisma.leave.findMany({
      include: {
        employee: { select: { name: true, email: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return res.status(200).json({ leaves });
  } catch (error) {
    next(error);
  }
};

export const applyLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { startDate, endDate, type, reason } = req.body;

  try {
    if (!startDate || !endDate || !type || !reason) {
      return res.status(400).json({ message: 'Start date, end date, leave type, and reason are required' });
    }

    const leave = await prisma.leave.create({
      data: {
        employeeId: req.user!.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: type as LeaveType,
        reason,
        status: 'PENDING',
      },
    });

    return res.status(201).json({ message: 'Leave application submitted successfully', leave });
  } catch (error) {
    next(error);
  }
};

export const updateLeaveStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status } = req.body; // APPROVED or REJECTED

  try {
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be APPROVED or REJECTED' });
    }

    const leave = await prisma.leave.update({
      where: { id },
      data: { status: status as LeaveStatus },
    });

    return res.status(200).json({ message: `Leave ${status.toLowerCase()} successfully`, leave });
  } catch (error) {
    next(error);
  }
};
