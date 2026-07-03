import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import Routes
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import salesRoutes from './routes/sales.routes.js';
import customerRoutes from './routes/customer.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import reportRoutes from './routes/report.routes.js';
import aiRoutes from './routes/ai.routes.js';
import settingsRoutes from './routes/settings.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows static assets loading if needed
}));
app.use(cors({
  origin: '*', // Customize this in production to specific URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting (Prevent abuse on POS and Auth endpoints)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    errors: err.errors || null,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

app.listen(PORT, () => {
  console.log(`[PalMart Server] listening on http://localhost:${PORT}`);
});
