import { Router } from 'express';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customer.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticateJWT, getCustomers);
router.get('/:id', authenticateJWT, getCustomerById);
router.post('/', authenticateJWT, createCustomer);
router.put('/:id', authenticateJWT, updateCustomer);
router.delete('/:id', authenticateJWT, deleteCustomer);

export default router;
