import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  importCSV,
  getCategories,
  getBrands,
  createCategory,
  createBrand,
} from '../controllers/product.controller.js';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Publicly accessible for cashiers to verify items and prices
router.get('/', authenticateJWT, getProducts);
router.get('/categories', authenticateJWT, getCategories);
router.get('/brands', authenticateJWT, getBrands);
router.get('/:id', authenticateJWT, getProductById);

// Restricted actions
router.post('/', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), createProduct);
router.put('/:id', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), updateProduct);
router.delete('/:id', authenticateJWT, requireRole([Role.ADMIN]), deleteProduct);
router.post('/import-csv', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), importCSV);

router.post('/categories', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), createCategory);
router.post('/brands', authenticateJWT, requireRole([Role.ADMIN, Role.MANAGER]), createBrand);

export default router;
