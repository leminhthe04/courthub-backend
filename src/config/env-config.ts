import 'dotenv/config';

export type NodeEnvironment = 'development' | 'test' | 'production';

/**
 * The single source of truth for backend environment variables.
 *
 * Keep all parsing and validation here so application modules and CLI scripts
 * use the same defaults and fail with the same error messages.
 */
export class EnvConfig {
  private readonly values: NodeJS.ProcessEnv;

  constructor(values: NodeJS.ProcessEnv = process.env) {
    this.values = { ...values };
  }

  get nodeEnv(): NodeEnvironment {
    const value = this.values.NODE_ENV ?? 'development';
    if (value !== 'development' && value !== 'test' && value !== 'production') {
      throw new Error('NODE_ENV must be one of: development, test, production');
    }

    return value;
  }

  get port(): number {
    return this.readInteger('PORT', 4000, 1, 65535);
  }

  get frontendUrls(): string[] {
    const value = this.values.FRONTEND_URL?.trim() || 'http://localhost:3000';
    const urls = value
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      throw new Error('FRONTEND_URL must contain at least one origin');
    }

    return urls;
  }

  get jwtSecret(): string {
    return this.readRequired('JWT_SECRET');
  }

  get databaseUrl(): string {
    return this.readRequired('DATABASE_URL');
  }

  get googleClientId(): string {
    return this.readRequired('GOOGLE_CLIENT_ID');
  }

  get googleClientSecret(): string {
    return this.readRequired('GOOGLE_CLIENT_SECRET');
  }

  get googleCallbackUrl(): string {
    return this.readRequired('GOOGLE_CALLBACK_URL');
  }

  get dbPoolMax(): number {
    return this.readInteger('DB_POOL_MAX', 10, 1);
  }

  private readRequired(name: string): string {
    const value = this.values[name]?.trim();
    if (!value) {
      throw new Error(`${name} is required to start CourtHub API`);
    }

    return value;
  }

  private readInteger(name: string, fallback: number, minimum: number, maximum?: number): number {
    const rawValue = this.values[name]?.trim();
    const value = rawValue ? Number(rawValue) : fallback;

    if (!Number.isInteger(value) || value < minimum || (maximum !== undefined && value > maximum)) {
      const range =
        maximum === undefined ? `at least ${minimum}` : `between ${minimum} and ${maximum}`;
      throw new Error(`${name} must be an integer ${range}`);
    }

    return value;
  }
}
