import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { EmailService } from './email.service';
import { PasswordResetRepository } from './password-reset.repository';
import { EnvConfigModule } from '../../config/env-config.module';
import { EnvConfig } from '../../config/env-config';

@Module({
  imports: [
    EnvConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [EnvConfigModule],
      inject: [EnvConfig],
      useFactory: (config: EnvConfig) => {
        config.validateAuthTokenTtls();
        return {
          secret: config.jwtSecret,
          signOptions: { expiresIn: `${config.accessTokenTtlMinutes}m` },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    EmailService,
    PasswordResetRepository,
  ],
  exports: [AuthService, AuthRepository, JwtStrategy],
})
export class AuthModule {}
