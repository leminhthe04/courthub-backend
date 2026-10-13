import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { AuthUser, JwtPayload } from '../../common/auth.types';
import { EnvConfig } from '../../config/env-config';
import { ErrorCode } from '../../common/error-codes';
import { AuthRepository } from './auth.repository';

function cookieExtractor(request: Request): string | null {
  return request?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: EnvConfig,
    private readonly repository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.repository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: user ? ErrorCode.AUTH_ACCOUNT_INACTIVE : ErrorCode.AUTH_ACCOUNT_NOT_FOUND,
      });
    }
    return {
      userId: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
    };
  }
}
