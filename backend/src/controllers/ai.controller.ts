import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

// Helper for APIS or HTTP calls to Gemini if key is provided
import axios from 'axios';

/**
 * 1. Demand & Sales Forecasting
 * Projects future item demands and overall sales using moving averages of past sales.
 */
export const getForecasts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { saleItems: true },
    });

    const forecasts = products.map((prod) => {
      // Calculate daily sales speed
      const totalSold = prod.saleItems.reduce((sum, item) => sum + item.quantity, 0);
      const mfgDate = prod.createdAt;
      const daysActive = Math.max(1, Math.ceil((Date.now() - new Date(mfgDate).getTime()) / (1000 * 60 * 60 * 24)));
      const dailyVelocity = totalSold / daysActive;

      // Project next 30 days demand
      const predicted30DaysDemand = Math.ceil(dailyVelocity * 30);
      const suggestedRestock = Math.max(0, predicted30DaysDemand - prod.currentStock);

      return {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        currentStock: prod.currentStock,
        dailyVelocity: parseFloat(dailyVelocity.toFixed(2)),
        predicted30DaysDemand,
        suggestedRestock,
        status: suggestedRestock > 0 ? 'RESTOCK_REQUIRED' : 'IN_STOCK',
      };
    });

    return res.status(200).json({ forecasts });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Product Recommendation Engine (Basket Association Rules)
 * Looks at transaction history to find which products are bought together.
 */
export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sales = await prisma.sale.findMany({
      include: { items: true },
    });

    // Simple market basket analysis (co-occurrence matrix)
    const pairCount: { [key: string]: number } = {};
    const itemFrequency: { [key: string]: number } = {};

    sales.forEach((sale) => {
      const productIds = sale.items.map((item) => item.productId);
      
      // Track single frequencies
      productIds.forEach((id) => {
        itemFrequency[id] = (itemFrequency[id] || 0) + 1;
      });

      // Track pair frequencies
      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const key = productIds[i] < productIds[j] 
            ? `${productIds[i]}_${productIds[j]}` 
            : `${productIds[j]}_${productIds[i]}`;
          pairCount[key] = (pairCount[key] || 0) + 1;
        }
      }
    });

    // Resolve product names
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const associations = Object.entries(pairCount).map(([key, count]) => {
      const [idA, idB] = key.split('_');
      const prodA = productMap.get(idA);
      const prodB = productMap.get(idB);

      const freqA = itemFrequency[idA] || 1;
      const freqB = itemFrequency[idB] || 1;

      // Confidence A -> B
      const confidenceAtoB = count / freqA;
      // Confidence B -> A
      const confidenceBtoA = count / freqB;

      return {
        productA: prodA ? { name: prodA.name, sku: prodA.sku } : null,
        productB: prodB ? { name: prodB.name, sku: prodB.sku } : null,
        coOccurrence: count,
        confidenceAtoB: parseFloat((confidenceAtoB * 100).toFixed(1)),
        confidenceBtoA: parseFloat((confidenceBtoA * 100).toFixed(1)),
      };
    }).filter(rule => rule.productA && rule.productB)
      .sort((a, b) => b.coOccurrence - a.coOccurrence)
      .slice(0, 10);

    return res.status(200).json({ associations });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Customer Segmentation (RFM analysis)
 * Segments customers based on Recency, Frequency, and Monetary scores.
 */
export const getCustomerSegmentation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { sales: true },
    });

    const segmented = customers.map((cust) => {
      const salesCount = cust.sales.length;
      if (salesCount === 0) {
        return {
          id: cust.id,
          name: cust.name,
          segment: 'INACTIVE',
          recencyDays: null,
          frequency: 0,
          totalSpent: 0,
        };
      }

      const totalSpent = cust.sales.reduce((sum, s) => sum + s.totalAmount, 0);
      const lastSaleDate = new Date(Math.max(...cust.sales.map((s) => new Date(s.createdAt).getTime())));
      const recencyDays = Math.ceil((Date.now() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24));

      // Simple segmentation rules
      let segment = 'REGULAR';
      if (totalSpent > 5000 && salesCount > 10 && recencyDays < 15) {
        segment = 'CHAMPION / VIP';
      } else if (recencyDays > 60) {
        segment = 'AT RISK / CHURNING';
      } else if (totalSpent > 2000 && salesCount > 5) {
        segment = 'LOYAL CUSTOMER';
      } else if (salesCount === 1) {
        segment = 'NEW BUYER';
      }

      return {
        id: cust.id,
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        segment,
        recencyDays,
        frequency: salesCount,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
      };
    });

    return res.status(200).json({ segmented });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Anomaly / Fake Billing Detection
 * Flag transactions with unusually high discounts, zero tax, off-hours execution, or extreme size deviations.
 */
export const getBillingAnomalies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        cashier: { select: { name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const anomalies = sales.map((sale) => {
      const alerts: string[] = [];
      
      // Threshold 1: Disproportionately high discounts (> 30% of order subtotal)
      if (sale.subTotal > 0 && (sale.discountAmount / sale.subTotal) > 0.3) {
        alerts.push('Suspiciously High Discount: discount exceeds 30% of subtotal.');
      }

      // Threshold 2: Cashier completing off-hours checkout (e.g. between 11 PM and 6 AM)
      const hours = new Date(sale.createdAt).getHours();
      if (hours >= 23 || hours < 6) {
        alerts.push(`Off-Hours Transaction: completed at ${hours}:00.`);
      }

      // Threshold 3: Zero-tax checkouts on large bills (> 1000 units with 0 GST)
      if (sale.totalAmount > 1000 && sale.gstAmount === 0) {
        alerts.push('Zero-Tax Transaction: Large total value checkout with zero tax reported.');
      }

      return {
        saleId: sale.id,
        cashierName: sale.cashier.name,
        customerName: sale.customer?.name || 'Walk-in Customer',
        totalAmount: sale.totalAmount,
        discountAmount: sale.discountAmount,
        createdAt: sale.createdAt,
        alerts,
        score: alerts.length * 35, // Mock score out of 100
      };
    }).filter((item) => item.alerts.length > 0);

    return res.status(200).json({ anomalies });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Interactive AI Chat Assistant
 * Integrates Google Gemini API if a key is loaded, or fallback NLP dictionary response for store stats.
 */
export const handleChatQuery = async (req: Request, res: Response, next: NextFunction) => {
  const { message } = req.body;

  try {
    if (!message) {
      return res.status(400).json({ message: 'Empty query message' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Gather latest real-time stats to feed NLP parser or Gemini prompt context
    const [salesCount, totalSales, lowStockCount, productsCount, customersCount] = await Promise.all([
      prisma.sale.count(),
      prisma.sale.aggregate({ _sum: { totalAmount: true } }),
      prisma.product.count({ where: { currentStock: { lte: prisma.product.fields.minStockLevel }, isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.customer.count(),
    ]);

    const statsContext = {
      totalSalesVal: totalSales._sum.totalAmount || 0,
      salesCount,
      lowStockCount,
      productsCount,
      customersCount,
    };

    if (geminiApiKey) {
      // Call Gemini 1.5/2.0 API (standard models)
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert AI Retail Consultant for PalMart Supermarket POS system. Here is the store's current database summary:
- Total Sales Revenue: INR ${statsContext.totalSalesVal}
- Number of Invoices: ${statsContext.salesCount}
- Low Stock Products Count: ${statsContext.lowStockCount}
- Active Unique Products: ${statsContext.productsCount}
- Registered Customers: ${statsContext.customersCount}

User asks: "${message}". Respond concisely in a helpful, analytical tone.`,
                  },
                ],
              },
            ],
          }
        );

        const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          return res.status(200).json({ reply });
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to local NLP engine.', geminiErr);
      }
    }

    // fallback NLP Dictionary logic
    let reply = "I am the PalMart AI Consultant. ";
    const msgLower = message.toLowerCase();

    if (msgLower.includes('sales') || msgLower.includes('revenue') || msgLower.includes('earning')) {
      reply += `Our total retail revenue is currently INR ${statsContext.totalSalesVal.toFixed(2)} across ${statsContext.salesCount} invoices.`;
    } else if (msgLower.includes('stock') || msgLower.includes('low') || msgLower.includes('refill')) {
      reply += `We currently have ${statsContext.lowStockCount} items below safety limits. I suggest checking the 'AI Forecasts' tab to trigger automatic restock orders.`;
    } else if (msgLower.includes('customer') || msgLower.includes('loyalty')) {
      reply += `The mart has ${statsContext.customersCount} unique registered shoppers. VIP segments are auto-calculated using RFM algorithms.`;
    } else if (msgLower.includes('recommend') || msgLower.includes('bundle')) {
      reply += `Based on association mining, customer basket analysis suggests pairing hot sellers together. Go to AI Recommendations tab to review pair-occurrence rules.`;
    } else {
      reply += `I have registered your question about "${message}". The store currently handles ${statsContext.productsCount} items. Let me know if you want stats about Sales, Customers, or Low Stock levels.`;
    }

    return res.status(200).json({ reply });
  } catch (error) {
    next(error);
  }
};
