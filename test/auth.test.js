import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { app } from '../src/app.js';
import { db } from '../src/config/db.js';

let server;
let baseUrl;

beforeAll(async () => {
  return new Promise((resolve) => {
    // Listen on port 0 to allocate an ephemeral free port
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

beforeEach(() => {
  db.reset();
});

describe('Authentication API Suite', () => {
  it('GET /api/health should return ok status and metrics', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('exchange-auth-backend');
    expect(body.metrics.registeredUsers).toBeGreaterThanOrEqual(1);
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user successfully and returns tokens', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bob Trader',
          email: 'bob@example.com',
          password: 'Password123!'
        })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('bob@example.com');
      expect(body.data.user.name).toBe('Bob Trader');
      expect(body.data.user.password).toBeUndefined(); // Password must not leak
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
    });

    it('rejects registration with existing email', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Demo Duplicate',
          email: 'trader@exchange.com', // Seeded demo user
          password: 'Password123!'
        })
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('already exists');
    });

    it('rejects registration with weak password (< 8 chars)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Weak Pass',
          email: 'weak@example.com',
          password: 'pass'
        })
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in seeded demo user with valid credentials', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'trader@exchange.com',
          password: 'Password123!'
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('trader@exchange.com');
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
    });

    it('rejects login with incorrect password', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'trader@exchange.com',
          password: 'WrongPassword999!'
        })
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Invalid email or password');
    });
  });

  describe('Protected Routes & Token Refresh', () => {
    it('accesses GET /api/auth/me with Bearer token', async () => {
      // Login first
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'trader@exchange.com',
          password: 'Password123!'
        })
      });
      const loginBody = await loginRes.json();
      const token = loginBody.data.tokens.accessToken;

      // Access protected me
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      expect(meRes.status).toBe(200);
      const meBody = await meRes.json();
      expect(meBody.success).toBe(true);
      expect(meBody.data.user.email).toBe('trader@exchange.com');
    });

    it('denies GET /api/auth/me without token', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Authentication token missing');
    });

    it('rotates refresh token and issues new tokens', async () => {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'trader@exchange.com',
          password: 'Password123!'
        })
      });
      const loginBody = await loginRes.json();
      const initialRefreshToken = loginBody.data.tokens.refreshToken;

      // Refresh
      const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: initialRefreshToken })
      });

      expect(refreshRes.status).toBe(200);
      const refreshBody = await refreshRes.json();
      expect(refreshBody.success).toBe(true);
      expect(refreshBody.data.tokens.accessToken).toBeDefined();
      expect(refreshBody.data.tokens.refreshToken).toBeDefined();
      expect(refreshBody.data.tokens.refreshToken).not.toBe(initialRefreshToken);

      // Re-using the old refresh token should now fail
      const reuseRes = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: initialRefreshToken })
      });
      expect(reuseRes.status).toBe(401);
    });

    it('logs out and revokes refresh token', async () => {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'trader@exchange.com',
          password: 'Password123!'
        })
      });
      const loginBody = await loginRes.json();
      const rToken = loginBody.data.tokens.refreshToken;

      // Logout
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rToken })
      });
      expect(logoutRes.status).toBe(200);

      // Subsequent refresh with that token must be rejected
      const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rToken })
      });
      expect(refreshRes.status).toBe(401);
    });
  });
});
