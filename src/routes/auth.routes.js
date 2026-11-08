import { Router } from 'express';
import { authController } from '../controller/auth.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema
} from '../utils/validators.js';

const router = Router();

// Public routes
router.post('/register', authRateLimiter, validate(registerSchema), (req, res, next) => {
  return authController.register(req, res, next);
});

router.post('/login', authRateLimiter, validate(loginSchema), (req, res, next) => {
  return authController.login(req, res, next);
});

router.post('/refresh', (req, res, next) => {
  return authController.refresh(req, res, next);
});

router.post('/logout', optionalAuth, (req, res, next) => {
  return authController.logout(req, res, next);
});

// Protected routes
router.get('/me', authenticate, (req, res, next) => {
  return authController.getMe(req, res, next);
});

router.put('/change-password', authenticate, validate(changePasswordSchema), (req, res, next) => {
  return authController.changePassword(req, res, next);
});

router.get('/verify', authenticate, (req, res, next) => {
  return authController.verifyToken(req, res, next);
});

export default router;
