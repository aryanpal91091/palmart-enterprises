import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PurchaseStatus } from '@prisma/client';

export const createPurchaseOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { supplierId, items } = req.body; // items: array of { productId, quantity, costPrice }

  try {
    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier ID and purchase items are required' });
    }

    let totalAmount = 0;
    const itemsData = items.map((item: any) => {
      const lineCost = parseFloat(item.costPrice) * parseInt(item.quantity, 10);
      totalAmount += lineCost;
      return {
        productId: item.productId,
        quantity: parseInt(item.quantity, 10),
        costPrice: parseFloat(item.costPrice),
      };
    });

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        status: 'PENDING',
        totalAmount,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: { select: { name: true } },
        items: true,
      },
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'PURCHASE_ORDER_CREATE',
          details: `Created Purchase Order to Supplier ID ${supplierId}. Total: ${totalAmount}`,
        },
      });
    }

    return res.status(201).json({ message: 'Purchase Order created successfully', purchaseOrder });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
  const { supplierId, status, page = '1', limit = '10' } = req.query;

  try {
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (supplierId) where.supplierId = supplierId as string;
    if (status) where.status = status as PurchaseStatus;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { name: true } },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return res.status(200).json({
      orders,
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

export const getPurchaseOrderById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true, currentStock: true } },
          },
        },
        supplier: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    return res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

export const receivePurchaseOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (order.status === 'RECEIVED') {
      return res.status(400).json({ message: 'Purchase Order has already been received' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update purchase status
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
      });

      // 2. Increment stock of each product and create stock-in logs
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity },
            costPrice: item.costPrice, // Update cost price to latest supplier price
          },
        });

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            quantityChange: item.quantity,
            type: 'STOCK_IN',
            reason: `Purchase order delivery received. PO ID: ${order.id}`,
          },
        });
      }

      // 3. Update supplier's outstanding balance
      await tx.supplier.update({
        where: { id: order.supplierId },
        data: {
          outstandingBalance: { increment: order.totalAmount },
        },
      });

      return updatedOrder;
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'PURCHASE_ORDER_RECEIVE',
          details: `Received stock for Purchase Order ID ${id}. Total Amount: ${result.totalAmount}`,
        },
      });
    }

    return res.status(200).json({ message: 'Inventory received and updated successfully', order: result });
  } catch (error) {
    next(error);
  }
};
