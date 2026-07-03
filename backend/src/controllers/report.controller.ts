import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import PDFDocument from 'pdfkit';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - 7);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 1. Core KPIs
    const [
      todaySales,
      weeklySales,
      monthlySales,
      totalSalesAgg,
      totalExpensesAgg,
      productsCount,
      lowStockCount,
      customersCount,
      suppliersCount,
      employeesCount,
    ] = await Promise.all([
      // Today sales
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Weekly sales
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfWeek } },
        _sum: { totalAmount: true },
      }),
      // Monthly sales
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      // Total sales all time
      prisma.sale.aggregate({
        _sum: { totalAmount: true, subTotal: true },
      }),
      // Total expenses
      prisma.expense.aggregate({
        _sum: { amount: true },
      }),
      // Counts
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { currentStock: { lte: prisma.product.fields.minStockLevel }, isActive: true } }),
      prisma.customer.count(),
      prisma.supplier.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    const totalRevenue = totalSalesAgg._sum.totalAmount || 0;
    const totalExpenses = totalExpensesAgg._sum.amount || 0;
    // Basic profit model: Sales Margin - Expenses
    // Calculate cost of goods sold (COGS) from SaleItem cost prices
    const saleItems = await prisma.saleItem.findMany({
      include: { product: { select: { costPrice: true } } },
    });
    const cogs = saleItems.reduce((sum, item) => sum + (item.product.costPrice * item.quantity), 0);
    const profit = Math.max(0, totalRevenue - cogs - totalExpenses);

    // 2. Build Graphs Data
    // A. Sales Trend (Last 7 days)
    const salesLast7Days = await prisma.sale.findMany({
      where: { createdAt: { gte: startOfWeek } },
      select: { createdAt: true, totalAmount: true },
    });

    const dailyTrendMap: { [key: string]: number } = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      dailyTrendMap[label] = 0;
    }

    salesLast7Days.forEach((sale) => {
      const label = new Date(sale.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (dailyTrendMap[label] !== undefined) {
        dailyTrendMap[label] += sale.totalAmount;
      }
    });

    const salesGraph = Object.entries(dailyTrendMap).map(([name, amount]) => ({ name, amount })).reverse();

    // B. Category Distribution
    const categories = await prisma.category.findMany({
      include: { products: { where: { isActive: true } } },
    });
    const categoryGraph = categories.map((cat) => ({
      name: cat.name,
      value: cat.products.length,
    }));

    // C. Inventory Status (In Stock vs Low Stock vs Out of Stock)
    const inStock = await prisma.product.count({ where: { currentStock: { gt: prisma.product.fields.minStockLevel }, isActive: true } });
    const outOfStock = await prisma.product.count({ where: { currentStock: 0, isActive: true } });
    
    const inventoryGraph = [
      { name: 'In Stock', value: inStock },
      { name: 'Low Stock', value: lowStockCount - outOfStock },
      { name: 'Out of Stock', value: outOfStock },
    ];

    // D. Monthly profit breakdown (mock curves for dashboard displays)
    const monthlyProfitGraph = [
      { name: 'Jan', profit: 4500, sales: 12000, expenses: 7500 },
      { name: 'Feb', profit: 5600, sales: 15000, expenses: 9400 },
      { name: 'Mar', profit: 6200, sales: 18000, expenses: 11800 },
      { name: 'Apr', profit: 7000, sales: 22000, expenses: 15000 },
      { name: 'May', profit: 9400, sales: 27000, expenses: 17600 },
      { name: 'Jun', profit: 11200, sales: 32000, expenses: 20800 },
    ];

    // 3. Recent Transactions
    const recentTransactions = await prisma.sale.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        cashier: { select: { name: true } },
      },
    });

    return res.status(200).json({
      kpis: {
        todaySales: todaySales._sum.totalAmount || 0,
        todaySalesCount: todaySales._count || 0,
        weeklySales: weeklySales._sum.totalAmount || 0,
        monthlySales: monthlySales._sum.totalAmount || 0,
        totalRevenue,
        profit,
        expenses: totalExpenses,
        productsCount,
        lowStockCount,
        customersCount,
        suppliersCount,
        employeesCount,
      },
      charts: {
        salesGraph,
        categoryGraph,
        inventoryGraph,
        monthlyProfitGraph,
      },
      recentTransactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generates and streams a professional PDF Receipt invoice to the client
 */
export const downloadInvoicePDF = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        cashier: { select: { name: true } },
      },
    });

    if (!sale) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } }) || {
      storeName: 'PalMart Store',
      gstNumber: '29GGGGG1111A1Z1',
      address: '123 Main St',
      phone: '0000000000',
      invoiceFooter: 'Thank you!',
      currency: 'INR',
    };

    // Create PDF Document stream
    const doc = new PDFDocument({ margin: 30 });
    
    res.setHeader('Content-disposition', `attachment; filename=invoice_${sale.id}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Document Header
    doc.fontSize(20).text(settings.storeName, { align: 'center' });
    doc.fontSize(10).text(settings.address, { align: 'center' });
    doc.text(`Phone: ${settings.phone} | GSTIN: ${settings.gstNumber}`, { align: 'center' });
    doc.moveDown(1);
    
    doc.text('---------------------------------------------------------------------------------', { align: 'center' });
    doc.moveDown(0.5);

    // Ticket Details
    doc.fontSize(11);
    doc.text(`Invoice ID: ${sale.id}`);
    doc.text(`Date/Time: ${new Date(sale.createdAt).toLocaleString()}`);
    doc.text(`Cashier: ${sale.cashier.name}`);
    doc.text(`Customer: ${sale.customer ? sale.customer.name : 'Walk-in'}`);
    doc.text(`Payment Method: ${sale.paymentMethod}`);
    doc.moveDown(1);

    doc.text('---------------------------------------------------------------------------------', { align: 'center' });
    doc.moveDown(0.5);

    // Items table header
    doc.font('Helvetica-Bold');
    doc.text('Item Description', 30, doc.y, { width: 220, continued: true });
    doc.text('Qty', 260, doc.y, { width: 50, continued: true });
    doc.text('Rate', 320, doc.y, { width: 80, continued: true });
    doc.text('Total', 420, doc.y, { width: 100 });
    doc.font('Helvetica');
    doc.moveDown(0.5);

    // Render items
    sale.items.forEach((item) => {
      doc.text(item.product.name, 30, doc.y, { width: 220, continued: true });
      doc.text(item.quantity.toString(), 260, doc.y, { width: 50, continued: true });
      doc.text(item.sellingPrice.toFixed(2), 320, doc.y, { width: 80, continued: true });
      doc.text(item.total.toFixed(2), 420, doc.y, { width: 100 });
      doc.moveDown(0.5);
    });

    doc.moveDown(0.5);
    doc.text('---------------------------------------------------------------------------------', { align: 'center' });
    doc.moveDown(0.5);

    // Invoice summary
    doc.font('Helvetica-Bold');
    doc.text(`Subtotal: ${settings.currency} ${(sale.subTotal).toFixed(2)}`, { align: 'right' });
    doc.text(`Discount: - ${settings.currency} ${sale.discountAmount.toFixed(2)}`, { align: 'right' });
    doc.text(`GST (Included): ${settings.currency} ${sale.gstAmount.toFixed(2)}`, { align: 'right' });
    doc.fontSize(14).text(`Grand Total: ${settings.currency} ${sale.totalAmount.toFixed(2)}`, { align: 'right' });
    doc.font('Helvetica').fontSize(10);

    doc.moveDown(2);
    doc.text(settings.invoiceFooter, { align: 'center', oblique: true });

    doc.end();
  } catch (error) {
    next(error);
  }
};
