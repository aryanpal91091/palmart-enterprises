import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ExpenseCategory } from '@prisma/client';

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  const { category, startDate, endDate } = req.query;

  try {
    const where: any = {};
    if (category) where.category = category as ExpenseCategory;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, item) => sum + item.amount, 0);

    return res.status(200).json({ expenses, total });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { title, category, amount, date, description, receiptUrl } = req.body;

  try {
    if (!title || !category || !amount) {
      return res.status(400).json({ message: 'Title, category, and amount are required' });
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        category: category as ExpenseCategory,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        description,
        receiptUrl,
      },
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'EXPENSE_CREATE',
          details: `Created expense: ${title} (${category}). Amount: ${amount}`,
        },
      });
    }

    return res.status(201).json({ message: 'Expense tracked successfully', expense });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const updatedData = { ...data };
    if (data.amount !== undefined) updatedData.amount = parseFloat(data.amount);
    if (data.date !== undefined) updatedData.date = new Date(data.date);

    const expense = await prisma.expense.update({
      where: { id },
      data: updatedData,
    });

    return res.status(200).json({ message: 'Expense updated successfully', expense });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    await prisma.expense.delete({ where: { id } });
    return res.status(200).json({ message: 'Expense record deleted' });
  } catch (error) {
    next(error);
  }
};
