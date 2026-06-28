import { existsSync } from 'node:fs';

// Load a local .env if present — but never during tests, where the runner supplies
// env explicitly and a dev .env must not silently point us at the dev database.
if (process.env.NODE_ENV !== 'test' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

export type NodeEnv = 'development' | 'test' | 'production';

export type AuthConfig = {
  cfTeamDomain: string | null;
  cfAud: string | null;
  devLoginEmail: string | null;
  seedAdminEmail: string | null;
};

export type AppConfig = {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  isProduction: boolean;
  auth: AuthConfig;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value : null;
}

function loadAuth(isProduction: boolean): AuthConfig {
  const cfTeamDomain = optional('CF_ACCESS_TEAM_DOMAIN');
  const cfAud = optional('CF_ACCESS_AUD');
  if (isProduction && (!cfTeamDomain || !cfAud)) {
    throw new Error('CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are required in production');
  }
  return {
    cfTeamDomain,
    cfAud,
    // The dev-login bypass is ignored in production regardless of the env var.
    devLoginEmail: isProduction ? null : optional('DEV_LOGIN_EMAIL'),
    seedAdminEmail: optional('SEED_ADMIN_EMAIL'),
  };
}

function loadConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV ?? 'development') as NodeEnv;
  const isProduction = nodeEnv === 'production';

  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT: "${process.env.PORT}" (expected a positive integer)`);
  }

  return {
    nodeEnv,
    port,
    databaseUrl: required('DATABASE_URL'),
    isProduction,
    auth: loadAuth(isProduction),
  };
}

export const config = loadConfig();
