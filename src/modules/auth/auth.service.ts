import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import type { Profile } from 'passport-google-oauth20';
import type { AuthUser, JwtPayload } from '../../common/auth.types';
import { ErrorCode } from '../../common/error-codes';
import { createUuidV7 } from '../../common/uuid';
import { AuthRepository, type AuthUserRecord } from './auth.repository';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const email = dto.email?.trim().toLowerCase() || null;
    const phone = dto.phone?.replace(/[\s().-]/g, '') || null;
    if (!email && !phone) {
      throw new ConflictException({
        code: ErrorCode.AUTH_CONTACT_REQUIRED,
        message: 'Email or phone is required',
      });
    }

    const duplicate = await this.repository.findByContact(email, phone);
    if (duplicate) {
      throw new ConflictException({
        code: ErrorCode.AUTH_CONTACT_ALREADY_EXISTS,
        message: 'Email or phone is already in use',
      });
    }

    const user = await this.repository.createCustomer({
      id: createUuidV7(),
      fullName: dto.fullName.trim(),
      email,
      phone,
      passwordHash: await hash(dto.password, 12),
      role: 'CUSTOMER',
    });

    return this.issueSession(user, userAgent, ipAddress);
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.repository.findByIdentifier(dto.identifier.trim());
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid login credentials',
      });
    }

    return this.issueSession(user, userAgent, ipAddress);
  }

  async loginWithGoogle(profile: Profile, userAgent?: string, ipAddress?: string) {
    const googleSubject = profile.id;
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    const emailVerified = profile._json?.email_verified === true;

    if (!googleSubject || !email || !emailVerified) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_GOOGLE_EMAIL_NOT_VERIFIED,
        message: 'A verified Google email is required',
      });
    }

    let user = await this.repository.findByGoogleSubject(googleSubject);
    if (!user) {
      user = await this.repository.findByContact(email, null);
    }

    if (user) {
      if (user.googleSubject !== googleSubject) {
        user = await this.repository.updateUser(user.id, { googleSubject });
      }
      return this.issueSession(user, userAgent, ipAddress);
    }

    const displayName =
      profile.displayName?.trim() ||
      [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ') ||
      email.split('@')[0];

    user = await this.repository.createCustomer({
      id: createUuidV7(),
      fullName: displayName.slice(0, 120),
      email,
      phone: null,
      googleSubject,
      passwordHash: await hash(randomBytes(32).toString('hex'), 12),
      role: 'CUSTOMER',
    });

    return this.issueSession(user, userAgent, ipAddress);
  }

  async refresh(rawRefreshToken: string, userAgent?: string, ipAddress?: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_REFRESH_TOKEN,
        message: 'Refresh token is required',
      });
    }

    const hash = this.hashToken(rawRefreshToken);
    const session = await this.repository.findSessionByHash(hash);

    if (!session) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_REFRESH_TOKEN,
        message: 'Invalid refresh token',
      });
    }

    if (session.isRevoked) {
      // Token reuse detection: revoked token was presented again
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_SESSION_REVOKED,
        message: 'Session has been revoked',
      });
    }

    if (new Date() > new Date(session.expiresAt)) {
      await this.repository.revokeSession(session.id, 'EXPIRED');
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_SESSION_EXPIRED,
        message: 'Session has expired',
      });
    }

    const user = await this.repository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_ACCOUNT_NOT_FOUND,
        message: 'Account does not exist',
      });
    }

    // Token Rotation: invalidate previous session and issue new one
    await this.repository.revokeSession(session.id, 'ROTATED');
    return this.issueSession(user, userAgent, ipAddress);
  }

  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const hash = this.hashToken(rawRefreshToken);
      const session = await this.repository.findSessionByHash(hash);
      if (session && !session.isRevoked) {
        await this.repository.revokeSession(session.id, 'LOGOUT');
      }
    }
    return { ok: true };
  }

  async getMe(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_ACCOUNT_NOT_FOUND,
        message: 'Account does not exist',
      });
    }
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_ACCOUNT_NOT_FOUND,
        message: 'Account does not exist',
      });
    }

    const email = dto.email !== undefined ? dto.email.trim().toLowerCase() || null : user.email;
    const phone = dto.phone !== undefined ? dto.phone.replace(/[\s().-]/g, '') || null : user.phone;
    const fullName = dto.fullName !== undefined ? dto.fullName.trim() : user.fullName;

    if (!email && !phone) {
      throw new ConflictException({
        code: ErrorCode.AUTH_CONTACT_REQUIRED,
        message: 'Email or phone is required',
      });
    }

    const duplicate = await this.repository.findByContactExcludingUser(userId, email, phone);
    if (duplicate) {
      throw new ConflictException({
        code: ErrorCode.AUTH_CONTACT_ALREADY_EXISTS,
        message: 'Email or phone is already in use by another account',
      });
    }

    const updated = await this.repository.updateUser(userId, {
      fullName,
      email,
      phone,
    });

    return this.sanitize(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_ACCOUNT_NOT_FOUND,
        message: 'Account does not exist',
      });
    }

    if (!dto.currentPassword || !(await compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_INVALID_CURRENT_PASSWORD,
        message: 'Current password is incorrect',
      });
    }

    if (!dto.newPassword || dto.newPassword.length < 8) {
      throw new BadRequestException({
        code: ErrorCode.AUTH_PASSWORD_TOO_SHORT,
        message: 'New password must be at least 8 characters',
      });
    }

    const passwordHash = await hash(dto.newPassword, 12);
    await this.repository.updateUser(userId, { passwordHash });

    return { ok: true };
  }

  private sanitize(user: AuthUserRecord): AuthUser {
    return {
      userId: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
    };
  }

  private async issueSession(user: AuthUserRecord, userAgent?: string, ipAddress?: string) {
    const safeUser = this.sanitize(user);
    const sessionId = createUuidV7();
    const rawRefreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.repository.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt,
    });

    const payload: JwtPayload = {
      sub: safeUser.userId,
      role: safeUser.role,
      email: safeUser.email,
      phone: safeUser.phone,
      sid: sessionId,
    };

    return {
      user: safeUser,
      accessToken: this.jwt.sign(payload),
      refreshToken: rawRefreshToken,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
