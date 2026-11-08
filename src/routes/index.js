import { Router } from 'express';
import authRoutes from './auth.routes.js';
import { db } from '../config/db.js';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// Health check endpoint
router.get('/health', async (req, res) => {
  const dbHealth = await db.healthCheck();
  res.json({
    status: 'ok',
    service: 'exchange-auth-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbHealth
  });
});

export default router;
