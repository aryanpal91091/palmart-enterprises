import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../config/db.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access Denied: No Token Provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'supersecretaccesstokensecretkey123!';
    const decoded = jwt.verify(token, accessSecret) as { id: string; email: string; role: Role };
    
    // Optional: Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ message: 'User account is inactive or disabled' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Access Denied: Invalid or Expired Token' });
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: Authentication Required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient Permissions' });
    }

    next();
  };
};
