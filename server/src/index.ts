import { config } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './db/client.js';

async function main() {
  // Fail fast if the database is unreachable at boot rather than on first request.
  await prisma.$connect();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`kpi-server listening on http://127.0.0.1:${config.port} (${config.nodeEnv})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start kpi-server:', err);
  process.exit(1);
});
