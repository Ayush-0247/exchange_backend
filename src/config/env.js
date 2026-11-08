import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'exchange_jwt_access_secret_key_change_in_production_123',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'exchange_jwt_refresh_secret_key_change_in_production_456',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
};
