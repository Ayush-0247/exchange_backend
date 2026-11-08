# Exchange Backend — Authentication Service

Robust, enterprise-grade Authentication Service with clean MVC architecture, JWT access and refresh token rotation, bcrypt password hashing, Zod schema validation, and Express middleware.

---

## 1. Project Structure

Following the requested clean separation of concerns:

```
src/
├── config/
│   ├── env.js                # Centralized environment variable management & defaults
│   └── db.js                 # In-memory database store (users & refresh tokens lifecycle)
├── controller/ (controllers/)
│   └── auth.controller.js     # Request handling, cookie management, HTTP response dispatching
├── routes/
│   ├── auth.routes.js        # Authentication route definitions
│   └── index.js              # Master API router with health check & metrics
├── services/
│   └── auth.service.js       # Business logic (register, login, refresh, logout, password change)
├── middleware/
│   ├── auth.middleware.js    # Bearer token & cookie JWT verification middleware
│   ├── validate.middleware.js# Zod request validation middleware
│   ├── rateLimiter.middleware.js # Express rate limiting for sensitive endpoints
│   └── error.middleware.js   # Global error handling and 404 response handler
├── utils/
│   ├── jwt.js                # Token generation (access & refresh) and verification
│   ├── password.js           # Bcrypt password hashing & secure comparison
│   ├── response.js           # Standardized API response formatters & ApiError
│   └── validators.js         # Zod schemas for register, login, refresh, changePassword
├── app.js                    # Express app configuration with Helmet, CORS, Morgan, & Static UI
└── server.js                 # Server entrypoint running on 0.0.0.0:3000
```

---

## 2. API Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Creates a new user account with hashed password and returns tokens. |
| `POST` | `/api/auth/login` | No | Authenticates user credentials and issues access & refresh tokens. |
| `POST` | `/api/auth/refresh` | No | Rotates refresh token and issues a new access/refresh token pair. |
| `POST` | `/api/auth/logout` | Optional | Invalids the active refresh token and clears session cookies. |
| `GET` | `/api/auth/me` | Bearer Token | Retrieves current user profile data (excluding password hash). |
| `PUT` | `/api/auth/change-password` | Bearer Token | Verifies current password and updates to new password. |
| `GET` | `/api/auth/verify` | Bearer Token | Quick health/validity verification for an active token. |
| `GET` | `/api/health` | No | Service health check and user metrics. |

---

## 3. Testing & Verification

```bash
# Run test suite (unit and integration tests)
npm test

# Run tests with code coverage
npm run test:cov

# Run linter
npm run lint

# Start server
npm run dev
```
