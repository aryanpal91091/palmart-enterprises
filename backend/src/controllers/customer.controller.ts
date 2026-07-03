import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  const { search, page = '1', limit = '10' } = req.query;

  try {
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return res.status(200).json({
      customers,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        loyaltyTransactions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { name, phone, email, address, membershipLevel = 'REGULAR', birthday, notes } = req.body;

  try {
    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone number are required' });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email: email || null,
        address,
        membershipLevel,
        birthday: birthday ? new Date(birthday) : null,
        notes,
      },
    });

    return res.status(201).json({ message: 'Customer created successfully', customer });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'A customer with this phone or email already exists' });
    }
    next(error);
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        birthday: data.birthday ? new Date(data.birthday) : undefined,
      },
    });

    return res.status(200).json({ message: 'Customer updated successfully', customer });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    await prisma.customer.delete({ where: { id } });
    return res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};
