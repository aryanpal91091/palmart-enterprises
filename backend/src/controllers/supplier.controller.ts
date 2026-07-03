import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  const { search, page = '1', limit = '10' } = req.query;

  try {
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { contactName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    return res.status(200).json({
      suppliers,
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

export const getSupplierById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    return res.status(200).json({ supplier });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { name, contactName, email, phone, address, outstandingBalance = 0 } = req.body;

  try {
    if (!name || !phone) {
      return res.status(400).json({ message: 'Supplier name and phone are required' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactName,
        email,
        phone,
        address,
        outstandingBalance: parseFloat(outstandingBalance),
      },
    });

    return res.status(201).json({ message: 'Supplier created successfully', supplier });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const updatedData = { ...data };
    if (data.outstandingBalance !== undefined) {
      updatedData.outstandingBalance = parseFloat(data.outstandingBalance);
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updatedData,
    });

    return res.status(200).json({ message: 'Supplier updated successfully', supplier });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    await prisma.supplier.delete({ where: { id } });
    return res.status(200).json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    next(error);
  }
};
