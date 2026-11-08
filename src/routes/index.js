import { Router } from 'express';
import authRoutes from './auth.routes.js';
import { db } from '../config/db.js';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// Health check endpoint
router.get('/health', async (req, res) => {
  const usersCount = await db.countUsers();
  res.json({
    status: 'ok',
    service: 'exchange-auth-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    metrics: {
      registeredUsers: usersCount
    }
  });
});

export default router;
