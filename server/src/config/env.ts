import { existsSync } from 'node:fs';

// Load a local .env if one exists. Importing this module is the first thing that
// touches process.env, so the file is loaded before any value is read below.
// In production there is no .env file — systemd/SSM provide the real environment.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export type NodeEnv = 'development' | 'test' | 'production';

export type AppConfig = {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  isProduction: boolean;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV ?? 'development') as NodeEnv;

  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT: "${process.env.PORT}" (expected a positive integer)`);
  }

  return {
    nodeEnv,
    port,
    databaseUrl: required('DATABASE_URL'),
    isProduction: nodeEnv === 'production',
  };
}

export const config = loadConfig();
