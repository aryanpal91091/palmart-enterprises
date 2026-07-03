import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PaymentMethod, PaymentStatus, LoyaltyType } from '@prisma/client';

export const createSale = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const {
    customerId,
    items, // array of { productId, quantity, discountPercent }
    paymentMethod, // CASH, CARD, UPI, SPLIT
    splitPayments, // if SPLIT: array of { method, amount }
    couponCode,
    pointsToRedeem = 0,
  } = req.body;

  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart items cannot be empty' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized POS session' });
    }

    // Wrap in a transaction to guarantee ACID integrity
    const result = await prisma.$transaction(async (tx) => {
      let subTotal = 0;
      let totalGst = 0;
      let totalDiscount = 0;

      const saleItemsData = [];
      const inventoryLogsToCreate = [];
      const lowStockNotifications = [];

      // 1. Calculate pricing for each item and check stock availability
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new Error(`Product with ID ${item.productId} not found or inactive`);
        }

        if (product.currentStock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.currentStock}`);
        }

        const quantity = item.quantity;
        const basePrice = product.sellingPrice;
        
        // Calculate discounts (combine product level + POS item override discount)
        const itemDiscountPercent = parseFloat(item.discountPercent || 0) + product.discount;
        const discountAmountPerUnit = (basePrice * itemDiscountPercent) / 100;
        const netSellingPrice = basePrice - discountAmountPerUnit;
        
        // Calculate tax (tax is inclusive in selling price, or added on top. Standard supermarket model is inclusive)
        const gstRate = product.gstPercent;
        const gstAmountPerUnit = netSellingPrice - (netSellingPrice / (1 + gstRate / 100));

        const itemSubtotal = basePrice * quantity;
        const itemDiscount = discountAmountPerUnit * quantity;
        const itemGst = gstAmountPerUnit * quantity;
        const itemTotal = netSellingPrice * quantity;

        subTotal += itemSubtotal;
        totalDiscount += itemDiscount;
        totalGst += itemGst;

        saleItemsData.push({
          productId: product.id,
          quantity,
          sellingPrice: basePrice,
          discountAmount: itemDiscount,
          gstAmount: itemGst,
          total: itemTotal,
        });

        // 2. Decrement stock
        const newStock = product.currentStock - quantity;
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });

        // Queue stock logs
        inventoryLogsToCreate.push({
          productId: product.id,
          quantityChange: -quantity,
          type: 'STOCK_OUT' as const,
          reason: 'POS Sale checkout',
        });

        // Queue low stock alerts
        if (newStock <= product.minStockLevel) {
          lowStockNotifications.push({
            title: 'Low Stock Warning',
            message: `Stock for ${product.name} is low (${newStock} items remaining)`,
            type: 'LOW_STOCK' as const,
          });
        }
      }

      // 3. Process Coupons
      let couponId = null;
      let couponDiscount = 0;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode },
        });

        if (coupon && coupon.isActive && coupon.expiryDate > new Date()) {
          const grandTotalBeforeCoupon = subTotal - totalDiscount;
          if (grandTotalBeforeCoupon >= coupon.minOrderAmount) {
            couponId = coupon.id;
            if (coupon.discountType === 'PERCENTAGE') {
              couponDiscount = (grandTotalBeforeCoupon * coupon.value) / 100;
            } else {
              couponDiscount = Math.min(coupon.value, grandTotalBeforeCoupon);
            }
            totalDiscount += couponDiscount;
          }
        }
      }

      // 4. Customer loyalty points adjustments
      let customer = null;
      let redeemedPointsVal = 0;
      if (customerId) {
        customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (customer && pointsToRedeem > 0) {
          if (customer.loyaltyPoints < pointsToRedeem) {
            throw new Error(`Customer only has ${customer.loyaltyPoints} points, cannot redeem ${pointsToRedeem}`);
          }
          // Let's assume 1 point = 1 Rupee/CurrencyUnit
          redeemedPointsVal = pointsToRedeem;
          totalDiscount += redeemedPointsVal;

          // Deduct from customer profile
          await tx.customer.update({
            where: { id: customerId },
            data: { loyaltyPoints: customer.loyaltyPoints - pointsToRedeem },
          });
        }
      }

      const finalTotalAmount = Math.max(0, subTotal - totalDiscount);

      // 5. Create Sale
      const sale = await tx.sale.create({
        data: {
          customerId: customerId || null,
          cashierId: req.user!.id,
          subTotal,
          discountAmount: totalDiscount,
          gstAmount: totalGst,
          totalAmount: finalTotalAmount,
          paymentMethod: paymentMethod as PaymentMethod,
          paymentStatus: 'PAID', // Default to paid
          couponId,
          items: {
            create: saleItemsData,
          },
        },
      });

      // 6. Record Payments
      if (paymentMethod === 'SPLIT') {
        if (!splitPayments || splitPayments.length === 0) {
          throw new Error('Split payments details must be provided when payment method is SPLIT');
        }
        let loggedAmt = 0;
        for (const split of splitPayments) {
          await tx.payment.create({
            data: {
              saleId: sale.id,
              amount: parseFloat(split.amount),
              method: split.method as PaymentMethod,
            },
          });
          loggedAmt += parseFloat(split.amount);
        }
        if (Math.abs(loggedAmt - finalTotalAmount) > 0.05) {
          // Allow minor rounding difference, otherwise force validation
          throw new Error(`Total split payment (${loggedAmt}) does not match invoice total (${finalTotalAmount})`);
        }
      } else {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            amount: finalTotalAmount,
            method: paymentMethod as PaymentMethod,
          },
        });
      }

      // 7. Add loyalty points if customer exists
      if (customerId && customer) {
        // e.g. Earn 1 point for every 100 spent
        const earnedPoints = Math.floor(finalTotalAmount / 100);
        if (earnedPoints > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { loyaltyPoints: { increment: earnedPoints } },
          });

          await tx.loyaltyTransaction.create({
            data: {
              customerId,
              points: earnedPoints,
              type: 'EARNED',
              saleId: sale.id,
            },
          });
        }

        if (pointsToRedeem > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              customerId,
              points: pointsToRedeem,
              type: 'REDEEMED',
              saleId: sale.id,
            },
          });
        }
      }

      // 8. Commit logs & notifications
      await tx.inventoryLog.createMany({ data: inventoryLogsToCreate });
      if (lowStockNotifications.length > 0) {
        await tx.notification.createMany({ data: lowStockNotifications });
      }

      return sale;
    });

    // Save Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'POS_SALE_CREATE',
        details: `POS transaction completed. Sale ID: ${result.id}. Total amount: ${result.totalAmount}`,
      },
    });

    const populatedSale = await prisma.sale.findUnique({
      where: { id: result.id },
      include: {
        items: { include: { product: { select: { name: true, sku: true, barcode: true } } } },
        payments: true,
        customer: true,
        cashier: { select: { name: true } },
      },
    });

    return res.status(201).json({ message: 'Sale registered successfully', sale: populatedSale });
  } catch (error: any) {
    console.error('POS Checkout Failed:', error.message);
    return res.status(400).json({ message: error.message || 'Checkout execution failed' });
  }
};

export const getSales = async (req: Request, res: Response, next: NextFunction) => {
  const {
    search,
    customerId,
    cashierId,
    startDate,
    endDate,
    paymentMethod,
    page = '1',
    limit = '10',
  } = req.query;

  try {
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (customerId) where.customerId = customerId as string;
    if (cashierId) where.cashierId = cashierId as string;
    if (paymentMethod) where.paymentMethod = paymentMethod as PaymentMethod;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    if (search) {
      // Find matches where customer name matches or ID matches
      where.OR = [
        { id: { contains: search as string, mode: 'insensitive' } },
        { customer: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          cashier: { select: { name: true } },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    return res.status(200).json({
      sales,
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

export const getSaleById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true, barcode: true, unit: true } },
          },
        },
        payments: true,
        customer: true,
        cashier: { select: { name: true } },
        coupon: true,
      },
    });

    if (!sale) {
      return res.status(404).json({ message: 'Sale invoice not found' });
    }

    return res.status(200).json({ sale });
  } catch (error) {
    next(error);
  }
};

export const returnSale = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { saleId, items } = req.body; // items: array of { productId, quantity, reason }

  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No return items specified' });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true },
    });

    if (!sale) {
      return res.status(404).json({ message: 'Original sale invoice not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let totalRefund = 0;

      for (const retItem of items) {
        const originalItem = sale.items.find((i) => i.productId === retItem.productId);
        if (!originalItem) {
          throw new Error(`Product ${retItem.productId} was not part of original invoice`);
        }

        if (originalItem.quantity < retItem.quantity) {
          throw new Error(`Return quantity exceeds original purchased quantity`);
        }

        // Calculate refund amount
        const itemRefundVal = (originalItem.total / originalItem.quantity) * retItem.quantity;
        totalRefund += itemRefundVal;

        // Register Return
        await tx.return.create({
          data: {
            saleId: sale.id,
            productId: retItem.productId,
            quantity: retItem.quantity,
            reason: retItem.reason || 'Customer return',
            refundAmount: itemRefundVal,
          },
        });

        // Re-increment stock
        await tx.product.update({
          where: { id: retItem.productId },
          data: { currentStock: { increment: retItem.quantity } },
        });

        // Add inventory log
        await tx.inventoryLog.create({
          data: {
            productId: retItem.productId,
            quantityChange: retItem.quantity,
            type: 'RETURN',
            reason: `POS Return refund (Invoice: ${sale.id})`,
          },
        });
      }

      // Deduct loyalty points if applicable
      if (sale.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: sale.customerId } });
        if (customer) {
          // Subtract based on proportion of refund
          const pointsToSubtract = Math.floor(totalRefund / 100);
          const updatedPoints = Math.max(0, customer.loyaltyPoints - pointsToSubtract);
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { loyaltyPoints: updatedPoints },
          });

          await tx.loyaltyTransaction.create({
            data: {
              customerId: sale.customerId,
              points: pointsToSubtract,
              type: 'REDEEMED',
              saleId: sale.id,
            },
          });
        }
      }

      return { totalRefund };
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'POS_RETURN_PROCESS',
          details: `Processed return for sale ${saleId}. Total refund: ${result.totalRefund}`,
        },
      });
    }

    return res.status(200).json({ message: 'Return items processed successfully', refundAmount: result.totalRefund });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Failed to process return' });
  }
};
