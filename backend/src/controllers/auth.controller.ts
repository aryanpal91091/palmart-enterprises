import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

// In-memory OTP storage for password resets
const otpCache = new Map<string, { otp: string; expires: number }>();

const getJwtExpiry = (
  envValue: string | undefined,
  fallback: SignOptions['expiresIn']
): SignOptions['expiresIn'] => {
  if (!envValue || !envValue.trim()) {
    return fallback;
  }

  const value = envValue.trim();
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  return value as SignOptions['expiresIn'];
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'supersecretaccesstokensecretkey123!';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshtokensecretkey123!';

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      accessSecret,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      refreshSecret,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    // Save Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: `Employee ${user.name} logged in successfully`,
        ipAddress: req.ip || 'unknown',
      },
    });

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshtokensecretkey123!';
    const decoded = jwt.verify(token, refreshSecret) as { id: string; email: string; role: Role };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    const accessSecret = process.env.JWT_ACCESS_SECRET || 'supersecretaccesstokensecretkey123!';
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      accessSecret,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    otpCache.set(email, { otp, expires });

    console.log(`[FORGOT PASSWORD OTP for ${email}]: ${otp}`);

    // In production, you would send this via nodemailer. For now, print to console and return success.
    return res.status(200).json({
      message: 'Password reset OTP sent to your email (simulated in console)',
      // We expose it here for easy debugging/testing if needed
      otp: process.env.NODE_ENV === 'production' ? undefined : otp,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const cached = otpCache.get(email);
    if (!cached) {
      return res.status(400).json({ message: 'No OTP requested for this email' });
    }

    if (Date.now() > cached.expires) {
      otpCache.delete(email);
      return res.status(400).json({ message: 'OTP has expired' });
    }

    if (cached.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    otpCache.delete(email);

    // Save Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        details: `Employee ${user.name} reset their password via OTP`,
        ipAddress: req.ip || 'unknown',
      },
    });

    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
