import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import apiRoutes from './routes/index.js';
import authRoutes from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { config } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

export const app = express();

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false // Allows the interactive HTML tester to run smoothly
}));
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.env !== 'test') {
  app.use(morgan('combined'));
}

// Serve interactive test frontend
app.use(express.static(rootDir));

// Mount API routes
app.use('/api', apiRoutes);
app.use('/auth', authRoutes); // Direct alias

// Fallback for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
