# Exchange Backend — Authentication Service (Prisma ORM & Neon PostgreSQL)

Robust, enterprise-grade Authentication Service with clean MVC architecture, Prisma 7 ORM, Neon PostgreSQL database, pure JavaScript (Node.js ES Modules), JWT access and refresh token rotation, bcrypt password hashing, and Zod validation.

---

## 1. Project Structure

Pure JavaScript (`.js`) architecture following clean separation of concerns:

```
prisma/
└── schema.prisma             # Prisma schema (User & RefreshToken models for PostgreSQL)
prisma.config.js              # Pure JavaScript Prisma 7 configuration
src/
├── config/
│   ├── env.js                # Centralized environment variable management & defaults
│   └── db.js                 # Prisma ORM client with Neon & PostgreSQL adapter
├── controller/ (controllers/)
│   └── auth.controller.js     # Request handling, cookie management, HTTP response dispatching
├── routes/
│   ├── auth.routes.js        # Authentication route definitions
│   └── index.js              # Master API router with /health check and database diagnostics
├── services/
│   └── auth.service.js       # Business logic (register, login, refresh, logout, password change)
├── middleware/
│   ├── auth.middleware.js    # Bearer token & cookie JWT verification middleware
│   ├── validate.middleware.js# Zod request validation middleware
│   ├── rateLimiter.middleware.js # Express rate limiting for sensitive endpoints
│   └── error.middleware.js   # Global error handling and 404 response handler
├── utils/
│   ├── jwt.js                # Token generation (access & refresh) with unique JTI claims
│   ├── password.js           # Bcrypt password hashing & secure comparison
│   ├── response.js           # Standardized API response formatters & ApiError
│   └── validators.js         # Zod schemas for register, login, refresh, changePassword
├── app.js                    # Express app configuration with Helmet, CORS, Morgan, & Static UI
└── server.js                 # Server entrypoint running on 0.0.0.0:3000
```

---

## 2. PostgreSQL / Neon Configuration

Set `DATABASE_URL` in your `.env` file with your connection string from Neon:

```env
DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require
```

On server start, Prisma automatically initializes the PostgreSQL schema if the tables do not already exist. You can also run:

```bash
# Generate Prisma Client
npx prisma generate

# Push schema directly to your Neon database
npx prisma db push
```

---

## 3. API Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Creates a new user in PostgreSQL and issues tokens. |
| `POST` | `/api/auth/login` | No | Authenticates user against PostgreSQL and issues access & refresh tokens. |
| `POST` | `/api/auth/refresh` | No | Rotates refresh token in PostgreSQL and issues a new token pair. |
| `POST` | `/api/auth/logout` | Optional | Revokes session and removes refresh token from PostgreSQL. |
| `GET` | `/api/auth/me` | Bearer Token | Retrieves current user profile data (excluding password hash). |
| `PUT` | `/api/auth/change-password` | Bearer Token | Verifies current password and updates hash in PostgreSQL. |
| `GET` | `/api/auth/verify` | Bearer Token | Quick health/validity verification for an active token. |
| `GET` | `/api/health` | No | Service and PostgreSQL database health diagnostics. |

---

## 4. Verification

```bash
# Run unit and integration tests
npm test

# Run code coverage
npm run test:cov

# Run linter
npm run lint

# Start server
npm run dev
```
