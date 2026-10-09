import { defineConfig } from 'drizzle-kit';
import { EnvConfig } from './src/config/env-config';

const config = new EnvConfig();

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.databaseUrl,
  },
  strict: true,
  verbose: true,
});
