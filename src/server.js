import { app } from './app.js';
import { config } from './config/env.js';
import { initPrismaSchema } from './config/db.js';

const PORT = config.port || 3000;
const HOST = config.host || '0.0.0.0';

app.listen(PORT, HOST, async () => {
  console.log(`🚀 Authentication Service running at http://${HOST}:${PORT}`);
  console.log(`📋 Interactive Dashboard & API Tester: http://${HOST}:${PORT}/`);
  console.log(`⚡ Prisma ORM & PostgreSQL (Neon) active at /api/auth/*`);

  if (config.databaseUrl) {
    try {
      await initPrismaSchema();
    } catch (err) {
      console.error('PostgreSQL Prisma table initialization notice:', err.message);
    }
  } else {
    console.warn('⚠️  DATABASE_URL not detected in environment. Provide your Neon connection string in .env');
  }
});
