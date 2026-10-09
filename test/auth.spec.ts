import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from '@jest/globals';
import { AuthService } from '../src/modules/auth/auth.service';
import type { AuthRepository } from '../src/modules/auth/auth.repository';
import type { RegisterDto } from '../src/modules/auth/dto/auth.dto';

describe('AuthModule', () => {
  it('requires email or phone when registering a customer', async () => {
    const service = new AuthService({} as AuthRepository, {} as JwtService);
    const dto = { fullName: 'Demo Customer', password: 'Password123!' } as RegisterDto;

    await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
  });
});
