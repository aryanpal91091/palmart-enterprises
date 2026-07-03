import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 'default' },
      });
    }
    return res.status(200).json({ settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const data = req.body;
  try {
    const updatedData = { ...data };
    if (data.taxRate !== undefined) updatedData.taxRate = parseFloat(data.taxRate);

    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: updatedData,
      create: { id: 'default', ...updatedData },
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'SETTINGS_UPDATE',
          details: 'Updated store info and billing tax rates.',
        },
      });
    }

    return res.status(200).json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    next(error);
  }
};

// Database Backup Logic
export const backupDatabase = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Query all tables
    const users = await prisma.user.findMany();
    const categories = await prisma.category.findMany();
    const brands = await prisma.brand.findMany();
    const suppliers = await prisma.supplier.findMany();
    const customers = await prisma.customer.findMany();
    const products = await prisma.product.findMany();
    const inventoryLogs = await prisma.inventoryLog.findMany();
    const purchaseOrders = await prisma.purchaseOrder.findMany();
    const purchaseItems = await prisma.purchaseOrderItem.findMany();
    const sales = await prisma.sale.findMany();
    const saleItems = await prisma.saleItem.findMany();
    const payments = await prisma.payment.findMany();
    const expenses = await prisma.expense.findMany();
    const returns = await prisma.return.findMany();
    const coupons = await prisma.coupon.findMany();
    const loyaltyTransactions = await prisma.loyaltyTransaction.findMany();
    const settings = await prisma.settings.findMany();
    const attendance = await prisma.attendance.findMany();
    const leaves = await prisma.leave.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: {
        users,
        categories,
        brands,
        suppliers,
        customers,
        products,
        inventoryLogs,
        purchaseOrders,
        purchaseItems,
        sales,
        saleItems,
        payments,
        expenses,
        returns,
        coupons,
        loyaltyTransactions,
        settings,
        attendance,
        leaves,
      },
    };

    // Return backup directly to user as downloadable file
    res.setHeader('Content-disposition', 'attachment; filename=palmart_backup.json');
    res.setHeader('Content-type', 'application/json');
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    next(error);
  }
};

// Database Restore Logic
export const restoreDatabase = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { backupData } = req.body;

  try {
    if (!backupData || !backupData.data) {
      return res.status(400).json({ message: 'Invalid backup file structure' });
    }

    const {
      users,
      categories,
      brands,
      suppliers,
      customers,
      products,
      inventoryLogs,
      purchaseOrders,
      purchaseItems,
      sales,
      saleItems,
      payments,
      expenses,
      returns,
      coupons,
      loyaltyTransactions,
      settings,
      attendance,
      leaves,
    } = backupData.data;

    // Reset database inside a giant transaction
    await prisma.$transaction(async (tx) => {
      // Clean tables (respecting foreign key constraints)
      await tx.settings.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.notification.deleteMany();
      await tx.loyaltyTransaction.deleteMany();
      await tx.coupon.deleteMany();
      await tx.return.deleteMany();
      await tx.payment.deleteMany();
      await tx.saleItem.deleteMany();
      await tx.sale.deleteMany();
      await tx.purchaseOrderItem.deleteMany();
      await tx.purchaseOrder.deleteMany();
      await tx.inventoryLog.deleteMany();
      await tx.product.deleteMany();
      await tx.supplier.deleteMany();
      await tx.brand.deleteMany();
      await tx.category.deleteMany();
      await tx.leave.deleteMany();
      await tx.attendance.deleteMany();
      await tx.user.deleteMany();

      // Populate tables
      if (users?.length) await tx.user.createMany({ data: users });
      if (categories?.length) await tx.category.createMany({ data: categories });
      if (brands?.length) await tx.brand.createMany({ data: brands });
      if (suppliers?.length) await tx.supplier.createMany({ data: suppliers });
      if (customers?.length) await tx.customer.createMany({ data: customers });
      if (products?.length) await tx.product.createMany({ data: products });
      if (inventoryLogs?.length) await tx.inventoryLog.createMany({ data: inventoryLogs });
      if (purchaseOrders?.length) await tx.purchaseOrder.createMany({ data: purchaseOrders });
      if (purchaseItems?.length) await tx.purchaseOrderItem.createMany({ data: purchaseItems });
      if (sales?.length) await tx.sale.createMany({ data: sales });
      if (saleItems?.length) await tx.saleItem.createMany({ data: saleItems });
      if (payments?.length) await tx.payment.createMany({ data: payments });
      if (expenses?.length) await tx.expense.createMany({ data: expenses });
      if (returns?.length) await tx.return.createMany({ data: returns });
      if (coupons?.length) await tx.coupon.createMany({ data: coupons });
      if (loyaltyTransactions?.length) await tx.loyaltyTransaction.createMany({ data: loyaltyTransactions });
      if (settings?.length) await tx.settings.createMany({ data: settings });
      if (attendance?.length) await tx.attendance.createMany({ data: attendance });
      if (leaves?.length) await tx.leave.createMany({ data: leaves });
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'SETTINGS_RESTORE',
          details: `Restored database to backup timestamp: ${backupData.timestamp}`,
        },
      });
    }

    return res.status(200).json({ message: 'Database state restored successfully' });
  } catch (error: any) {
    console.error('Restore Error:', error.message);
    return res.status(400).json({ message: error.message || 'Database restore failed' });
  }
};
