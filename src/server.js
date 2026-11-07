import { app } from './app.js';

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Matching engine server running at http://${HOST}:${PORT}`);
});
