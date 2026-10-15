import 'dotenv/config';

export type NodeEnvironment = 'development' | 'development_ngrok' | 'test' | 'production';

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
    if (
      value !== 'development' &&
      value !== 'development_ngrok' &&
      value !== 'test' &&
      value !== 'production'
    ) {
      throw new Error('NODE_ENV must be one of: development, development_ngrok, test, production');
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

  get accessTokenTtlMinutes(): number {
    return this.readRequiredInteger('ACCESS_TOKEN_TTL_MINUTES', 1, 1440);
  }

  get refreshTokenTtlDays(): number {
    return this.readRequiredInteger('REFRESH_TOKEN_TTL_DAYS', 1, 365);
  }

  validateAuthTokenTtls(): void {
    void this.accessTokenTtlMinutes;
    void this.refreshTokenTtlDays;
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

  get resendApiKey(): string {
    return this.readRequired('RESEND_API_KEY');
  }

  get resendFromEmail(): string {
    return this.readRequired('RESEND_FROM_EMAIL');
  }

  get resendReplyTo(): string {
    return this.readRequired('RESEND_REPLY_TO');
  }

  get passwordResetTokenTtlMinutes(): number {
    const rawValue = this.readRequired('PASSWORD_RESET_TOKEN_TTL_MINUTES');
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < 1 || value > 1440) {
      throw new Error('PASSWORD_RESET_TOKEN_TTL_MINUTES must be an integer between 1 and 1440');
    }
    return value;
  }

  get cookieOptions(): { sameSite: 'lax' | 'none'; secure: boolean } {
    if (this.nodeEnv === 'development_ngrok') {
      return { sameSite: 'none', secure: true };
    }

    return {
      sameSite: 'lax',
      secure: this.nodeEnv === 'production',
    };
  }

  get payosClientId(): string {
    return this.readRequired('PAYOS_CLIENT_ID');
  }

  get payosApiKey(): string {
    return this.readRequired('PAYOS_API_KEY');
  }

  get payosChecksumKey(): string {
    return this.readRequired('PAYOS_CHECKSUM_KEY');
  }

  get payosReturnUrl(): string {
    return this.readRequired('PAYOS_RETURN_URL');
  }

  get payosCancelUrl(): string {
    return this.readRequired('PAYOS_CANCEL_URL');
  }

  get payosWebhookUrl(): string {
    return this.readRequired('PAYOS_WEBHOOK_URL');
  }

  get paymentHoldMinutes(): number {
    return this.readRequiredInteger('PAYMENT_HOLD_MINUTES', 1, 60);
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

  private readRequiredInteger(name: string, minimum: number, maximum?: number): number {
    const rawValue = this.readRequired(name);
    const value = Number(rawValue);

    if (!Number.isInteger(value) || value < minimum || (maximum !== undefined && value > maximum)) {
      const range =
        maximum === undefined ? `at least ${minimum}` : `between ${minimum} and ${maximum}`;
      throw new Error(`${name} must be an integer ${range}`);
    }

    return value;
  }
}
