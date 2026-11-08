import pg from 'pg';
import { Pool as NeonPool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

const connectionString = config.databaseUrl || process.env.DATABASE_URL || '';

/**
 * Creates the appropriate Prisma Client adapter based on connection string.
 */
function createPrismaClient() {
  if (!connectionString) {
    // Unconfigured state
    return null;
  }

  const isNeon = connectionString.includes('neon.tech');

  if (isNeon) {
    const neonPool = new NeonPool({ connectionString });
    const adapter = new PrismaNeon(neonPool);
    return new PrismaClient({ adapter });
  } else {
    const pgPool = new pg.Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pgPool);
    return new PrismaClient({ adapter });
  }
}

export const prisma = createPrismaClient();

let isSchemaEnsured = false;

/**
 * Ensures Prisma database tables exist in PostgreSQL / Neon.
 */
export async function initPrismaSchema() {
  if (isSchemaEnsured || !prisma) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) DEFAULT '',
        password VARCHAR(255) NOT NULL,
        role VARCHAR(32) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
    `);
    isSchemaEnsured = true;
    console.log('✅ Prisma ORM: PostgreSQL (Neon) tables verified successfully.');
  } catch (err) {
    console.error('Prisma schema initialization note:', err.message);
  }
}

/**
 * Database access layer powered by Prisma ORM for PostgreSQL.
 */
class PrismaDatabase {
  _getPrisma() {
    if (!prisma) {
      throw new Error(
        'PostgreSQL database connection is not configured. Please set DATABASE_URL in your .env file with your Neon connection string.'
      );
    }
    return prisma;
  }

  async findUserByEmail(email) {
    const client = this._getPrisma();
    if (!email) return null;
    return client.user.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: 'insensitive'
        }
      }
    });
  }

  async findUserById(id) {
    const client = this._getPrisma();
    if (!id) return null;
    return client.user.findUnique({
      where: { id }
    });
  }

  async createUser({ email, password, name = '', role = 'user' }) {
    const client = this._getPrisma();
    return client.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password,
        name: name.trim(),
        role
      }
    });
  }

  async updateUser(id, updates) {
    const client = this._getPrisma();
    return client.user.update({
      where: { id },
      data: updates
    });
  }

  async countUsers() {
    if (!prisma) return 0;
    try {
      return await prisma.user.count();
    } catch {
      return 0;
    }
  }

  async saveRefreshToken({ token, userId, expiresAt }) {
    const client = this._getPrisma();
    return client.refreshToken.upsert({
      where: { token },
      update: { expiresAt },
      create: {
        token,
        userId,
        expiresAt
      }
    });
  }

  async findRefreshToken(token) {
    const client = this._getPrisma();
    if (!token) return null;
    return client.refreshToken.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date()
        }
      }
    });
  }

  async deleteRefreshToken(token) {
    const client = this._getPrisma();
    if (!token) return;
    try {
      await client.refreshToken.delete({
        where: { token }
      });
    } catch (err) {
      // Record might already be deleted
      if (err.code !== 'P2025') throw err;
    }
  }

  async deleteUserRefreshTokens(userId) {
    const client = this._getPrisma();
    if (!userId) return;
    await client.refreshToken.deleteMany({
      where: { userId }
    });
  }

  async healthCheck() {
    if (!prisma) {
      return {
        connected: false,
        orm: 'Prisma 7',
        database: 'PostgreSQL (Neon)',
        message: 'DATABASE_URL is not set in .env'
      };
    }

    try {
      const userCount = await prisma.user.count();
      return {
        connected: true,
        orm: 'Prisma 7',
        database: 'PostgreSQL (Neon)',
        userCount
      };
    } catch (err) {
      return {
        connected: false,
        orm: 'Prisma 7',
        database: 'PostgreSQL (Neon)',
        error: err.message
      };
    }
  }
}

export const db = new PrismaDatabase();
