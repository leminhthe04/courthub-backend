import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { EnvConfigModule } from '../../config/env-config.module';
import { EnvConfig } from '../../config/env-config';

@Module({
  imports: [
    EnvConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [EnvConfigModule],
      inject: [EnvConfig],
      useFactory: (config: EnvConfig) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
