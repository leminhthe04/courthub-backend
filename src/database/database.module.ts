import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { EnvConfigModule } from '../config/env-config.module';
import { EnvConfig } from '../config/env-config';

// Shared Drizzle database provider.

export const DATABASE = Symbol('DATABASE');
export type Database = ReturnType<typeof drizzle<typeof schema>>;

@Global()
@Module({
  imports: [EnvConfigModule],
  providers: [
    {
      provide: DATABASE,
      inject: [EnvConfig],
      useFactory: (config: EnvConfig) => {
        const pool = new Pool({
          connectionString: config.databaseUrl,
          max: config.dbPoolMax,
          ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
        });

        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
