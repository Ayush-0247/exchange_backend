import { app } from './app.js';
import { config } from './config/env.js';

const PORT = config.port || 3000;
const HOST = config.host || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Authentication Service running at http://${HOST}:${PORT}`);
  console.log(`📋 API Docs & Interactive Tester: http://${HOST}:${PORT}/`);
  console.log(`🔒 Auth endpoints active at /api/auth/*`);
});
