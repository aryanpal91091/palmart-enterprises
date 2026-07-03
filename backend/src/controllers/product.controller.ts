import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  const {
    search,
    categoryId,
    brandId,
    stockStatus,
    expiryStatus,
    page = '1',
    limit = '10',
    sortBy = 'name',
    order = 'asc',
  } = req.query;

  try {
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build Prisma query filter
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { barcode: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (brandId) {
      where.brandId = brandId as string;
    }

    // Stock Filters
    if (stockStatus === 'low') {
      where.currentStock = { lte: prisma.product.fields.minStockLevel };
    } else if (stockStatus === 'out') {
      where.currentStock = 0;
    }

    // Expiry Filters
    const now = new Date();
    if (expiryStatus === 'expired') {
      where.expDate = { lt: now };
    } else if (expiryStatus === 'near') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.expDate = {
        gte: now,
        lte: thirtyDaysFromNow,
      };
    }

    // Sort mappings
    let orderBy: any = {};
    if (sortBy === 'category') {
      orderBy = { category: { name: order as 'asc' | 'desc' } };
    } else if (sortBy === 'brand') {
      orderBy = { brand: { name: order as 'asc' | 'desc' } };
    } else {
      orderBy[sortBy as string] = order as 'asc' | 'desc';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          category: { select: { name: true } },
          brand: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return res.status(200).json({
      products,
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

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        supplier: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const {
    name,
    description,
    sku,
    barcode,
    imageUrl,
    unit,
    costPrice,
    sellingPrice,
    discount,
    gstPercent,
    mfgDate,
    expDate,
    batchNumber,
    categoryId,
    brandId,
    supplierId,
    currentStock = 0,
    minStockLevel = 5,
  } = req.body;

  try {
    // Basic validations
    if (!name || !sku || !categoryId || !brandId) {
      return res.status(400).json({ message: 'Name, SKU, category, and brand are required' });
    }

    // Check SKU unique
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return res.status(400).json({ message: `Product with SKU ${sku} already exists` });
    }

    // Check Barcode unique if provided
    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
      if (existingBarcode) {
        return res.status(400).json({ message: `Product with barcode ${barcode} already exists` });
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        sku,
        barcode,
        imageUrl,
        unit: unit || 'pcs',
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        discount: parseFloat(discount || 0),
        gstPercent: parseFloat(gstPercent || 18),
        mfgDate: mfgDate ? new Date(mfgDate) : null,
        expDate: expDate ? new Date(expDate) : null,
        batchNumber,
        currentStock: parseInt(currentStock, 10),
        minStockLevel: parseInt(minStockLevel, 10),
        categoryId,
        brandId,
        supplierId: supplierId || null,
      },
    });

    // Create initial stock in log
    if (parseInt(currentStock, 10) > 0) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          quantityChange: parseInt(currentStock, 10),
          type: 'STOCK_IN',
          reason: 'Initial inventory creation',
        },
      });
    }

    // Save Audit Log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'PRODUCT_CREATE',
          details: `Created product ${name} (SKU: ${sku})`,
        },
      });
    }

    return res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clean dates and numeric formats
    const updatedData: any = { ...data };
    if (data.costPrice !== undefined) updatedData.costPrice = parseFloat(data.costPrice);
    if (data.sellingPrice !== undefined) updatedData.sellingPrice = parseFloat(data.sellingPrice);
    if (data.discount !== undefined) updatedData.discount = parseFloat(data.discount);
    if (data.gstPercent !== undefined) updatedData.gstPercent = parseFloat(data.gstPercent);
    if (data.currentStock !== undefined) updatedData.currentStock = parseInt(data.currentStock, 10);
    if (data.minStockLevel !== undefined) updatedData.minStockLevel = parseInt(data.minStockLevel, 10);
    if (data.mfgDate !== undefined) updatedData.mfgDate = data.mfgDate ? new Date(data.mfgDate) : null;
    if (data.expDate !== undefined) updatedData.expDate = data.expDate ? new Date(data.expDate) : null;

    const product = await prisma.product.update({
      where: { id },
      data: updatedData,
    });

    // Check stock difference
    const stockDiff = product.currentStock - existing.currentStock;
    if (stockDiff !== 0) {
      await prisma.inventoryLog.create({
        data: {
          productId: product.id,
          quantityChange: stockDiff,
          type: stockDiff > 0 ? 'STOCK_IN' : 'STOCK_OUT',
          reason: 'Manual stock adjustment override',
        },
      });
    }

    // Check if stock has gone below limit to raise notification
    if (product.currentStock <= product.minStockLevel && existing.currentStock > product.minStockLevel) {
      await prisma.notification.create({
        data: {
          title: 'Low Stock Warning',
          message: `Product ${product.name} has fallen below its safety level (${product.currentStock} left).`,
          type: 'LOW_STOCK',
        },
      });
    }

    // Save Audit Log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'PRODUCT_UPDATE',
          details: `Updated product ${product.name} (SKU: ${product.sku})`,
        },
      });
    }

    return res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Soft delete to preserve invoice history integrity
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    // Save Audit Log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'PRODUCT_DELETE',
          details: `Soft-deleted product ${product.name} (SKU: ${product.sku})`,
        },
      });
    }

    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const importCSV = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { csvString } = req.body; // Expect parsed strings from frontend or simple raw body

  try {
    if (!csvString) {
      return res.status(400).json({ message: 'No CSV content provided' });
    }

    const lines = csvString.split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV has no data rows' });
    }

    // Basic CSV parser
    const headers = lines[0].split(',').map((h: string) => h.trim());
    let importedCount = 0;

    // Get default category and brand to fall back on if not provided
    let defaultCat = await prisma.category.findFirst();
    if (!defaultCat) {
      defaultCat = await prisma.category.create({ data: { name: 'Uncategorized' } });
    }
    let defaultBrand = await prisma.brand.findFirst();
    if (!defaultBrand) {
      defaultBrand = await prisma.brand.create({ data: { name: 'Generic' } });
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',');
      const name = cols[0]?.trim();
      const sku = cols[1]?.trim();
      const sellingPrice = parseFloat(cols[2] || '0');
      const costPrice = parseFloat(cols[3] || '0');
      const currentStock = parseInt(cols[4] || '0', 10);
      const barcode = cols[5]?.trim() || null;

      if (!name || !sku) continue;

      // Upsert
      await prisma.product.upsert({
        where: { sku },
        update: {
          name,
          sellingPrice,
          costPrice,
          currentStock,
          barcode,
        },
        create: {
          name,
          sku,
          sellingPrice,
          costPrice,
          currentStock,
          barcode,
          categoryId: defaultCat.id,
          brandId: defaultBrand.id,
        },
      });
      importedCount++;
    }

    return res.status(200).json({ message: `Successfully imported/updated ${importedCount} products.` });
  } catch (error) {
    next(error);
  }
};

// Auxiliary routes
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
};

export const getBrands = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json({ brands });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { name, description } = req.body;
  try {
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const category = await prisma.category.create({ data: { name, description } });
    return res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
};

export const createBrand = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { name } = req.body;
  try {
    if (!name) return res.status(400).json({ message: 'Brand name is required' });
    const brand = await prisma.brand.create({ data: { name } });
    return res.status(201).json({ brand });
  } catch (error) {
    next(error);
  }
};
