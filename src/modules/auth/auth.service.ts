import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import type { AuthUser, JwtPayload } from '../../common/auth.types';
import { createUuidV7 } from '../../common/uuid';
import { AuthRepository, type AuthUserRecord } from './auth.repository';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email?.trim().toLowerCase() || null;
    const phone = dto.phone?.replace(/[\s().-]/g, '') || null;
    if (!email && !phone) {
      throw new ConflictException('Email or phone is required');
    }

    const duplicate = await this.repository.findByContact(email, phone);
    if (duplicate) throw new ConflictException('Email or phone is already in use');

    const user = await this.repository.createCustomer({
      id: createUuidV7(),
      fullName: dto.fullName.trim(),
      email,
      phone,
      passwordHash: await hash(dto.password, 12),
      role: 'CUSTOMER',
    });

    return this.issueSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.repository.findByIdentifier(dto.identifier.trim());
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    return this.issueSession(user);
  }

  async getMe(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user) throw new UnauthorizedException('Account does not exist');
    return this.sanitize(user);
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

  private issueSession(user: AuthUserRecord) {
    const safeUser = this.sanitize(user);
    const payload: JwtPayload = {
      sub: safeUser.userId,
      role: safeUser.role,
      email: safeUser.email,
      phone: safeUser.phone,
    };
    return { user: safeUser, accessToken: this.jwt.sign(payload) };
  }
}
