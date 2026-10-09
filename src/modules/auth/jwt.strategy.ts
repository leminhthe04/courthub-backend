import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { AuthUser, JwtPayload } from '../../common/auth.types';
import { EnvConfig } from '../../config/env-config';

function cookieExtractor(request: Request): string | null {
  return request?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: EnvConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
      phone: payload.phone,
    };
  }
}
