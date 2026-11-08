import bcrypt from 'bcryptjs';

const DEMO_PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

/**
 * In-Memory Data Store for Authentication.
 * Supports User accounts and Refresh Tokens lifecycle without external DB dependency.
 */
class InMemoryDatabase {
  constructor() {
    this.users = new Map();
    this.refreshTokens = new Map(); // tokenString -> { userId, expiresAt, createdAt }
    this._seedDemoUsers();
  }

  _seedDemoUsers() {
    const demoUser = {
      id: 'usr_demo_1',
      email: 'trader@exchange.com',
      name: 'Demo Trader',
      password: DEMO_PASSWORD_HASH,
      role: 'user',
      isVerified: true,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z')
    };
    this.users.set(demoUser.id, demoUser);
  }

  // --- User Operations ---
  async findUserByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return null;
  }

  async findUserById(id) {
    if (!id) return null;
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async createUser({ email, password, name = '', role = 'user' }) {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const user = {
      id,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password, // hashed beforehand
      role,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return { ...user };
  }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;

    const updated = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    this.users.set(id, updated);
    return { ...updated };
  }

  async countUsers() {
    return this.users.size;
  }

  // --- Refresh Token Operations ---
  async saveRefreshToken({ token, userId, expiresAt }) {
    this.refreshTokens.set(token, {
      userId,
      expiresAt,
      createdAt: new Date()
    });
  }

  async findRefreshToken(token) {
    const record = this.refreshTokens.get(token);
    if (!record) return null;

    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      this.refreshTokens.delete(token);
      return null;
    }
    return record;
  }

  async deleteRefreshToken(token) {
    return this.refreshTokens.delete(token);
  }

  async deleteUserRefreshTokens(userId) {
    for (const [token, record] of this.refreshTokens.entries()) {
      if (record.userId === userId) {
        this.refreshTokens.delete(token);
      }
    }
  }

  // Reset database for test environments
  reset() {
    this.users.clear();
    this.refreshTokens.clear();
    this._seedDemoUsers();
  }
}

export const db = new InMemoryDatabase();
