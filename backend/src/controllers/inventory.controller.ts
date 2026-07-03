import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { InventoryLogType } from '@prisma/client';

export const getInventoryLogs = async (req: Request, res: Response, next: NextFunction) => {
  const { productId, type, page = '1', limit = '10' } = req.query;

  try {
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (productId) where.productId = productId as string;
    if (type) where.type = type as InventoryLogType;

    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true, currentStock: true } },
        },
      }),
      prisma.inventoryLog.count({ where }),
    ]);

    return res.status(200).json({
      logs,
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

export const adjustStock = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { productId, quantityChange, type, reason } = req.body;

  try {
    if (!productId || quantityChange === undefined || !type) {
      return res.status(400).json({ message: 'Product ID, quantity change, and type are required' });
    }

    const change = parseInt(quantityChange, 10);
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newStock = Math.max(0, product.currentStock + change);

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      const log = await tx.inventoryLog.create({
        data: {
          productId,
          quantityChange: change,
          type: type as InventoryLogType,
          reason: reason || 'Manual inventory adjustment',
        },
      });

      return { updatedProduct, log };
    });

    // Check low stock condition to log system-wide warning
    if (newStock <= product.minStockLevel) {
      await prisma.notification.create({
        data: {
          title: 'Low Stock Level',
          message: `Product ${product.name} is now low in stock (${newStock} items).`,
          type: 'LOW_STOCK',
        },
      });
    }

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'STOCK_ADJUSTMENT',
          details: `Adjusted stock of ${product.name} by ${change}. Status: ${type}`,
        },
      });
    }

    return res.status(200).json({
      message: 'Stock adjusted successfully',
      currentStock: result.updatedProduct.currentStock,
      log: result.log,
    });
  } catch (error) {
    next(error);
  }
};

export const transferStock = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { productId, quantity, fromLocation, toLocation, reason } = req.body;

  try {
    if (!productId || !quantity || !fromLocation || !toLocation) {
      return res.status(400).json({ message: 'Product ID, quantity, fromLocation, and toLocation are required' });
    }

    const qty = parseInt(quantity, 10);
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.currentStock < qty) {
      return res.status(400).json({ message: `Insufficient stock to transfer. Available: ${product.currentStock}` });
    }

    // Since we track location virtually in this system, we log the transfers
    const result = await prisma.$transaction(async (tx) => {
      // Create transfer out log
      await tx.inventoryLog.create({
        data: {
          productId,
          quantityChange: -qty,
          type: 'TRANSFER_OUT',
          reason: `Transfer to ${toLocation}. ${reason || ''}`,
          location: fromLocation,
        },
      });

      // Create transfer in log
      const logIn = await tx.inventoryLog.create({
        data: {
          productId,
          quantityChange: qty,
          type: 'TRANSFER_IN',
          reason: `Received from ${fromLocation}. ${reason || ''}`,
          location: toLocation,
        },
      });

      return logIn;
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'STOCK_TRANSFER',
          details: `Transferred ${qty} of ${product.name} from ${fromLocation} to ${toLocation}`,
        },
      });
    }

    return res.status(200).json({ message: 'Stock transfer logged successfully', log: result });
  } catch (error) {
    next(error);
  }
};

export const getInventoryAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [lowStock, expired, nearExpiry] = await Promise.all([
      // Low stock
      prisma.product.findMany({
        where: {
          isActive: true,
          currentStock: { lte: prisma.product.fields.minStockLevel },
        },
        select: { id: true, name: true, sku: true, currentStock: true, minStockLevel: true },
      }),
      // Expired
      prisma.product.findMany({
        where: {
          isActive: true,
          expDate: { lt: now },
        },
        select: { id: true, name: true, sku: true, expDate: true, currentStock: true },
      }),
      // Near expiry
      prisma.product.findMany({
        where: {
          isActive: true,
          expDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
        select: { id: true, name: true, sku: true, expDate: true, currentStock: true },
      }),
    ]);

    return res.status(200).json({
      lowStock,
      expired,
      nearExpiry,
    });
  } catch (error) {
    next(error);
  }
};
