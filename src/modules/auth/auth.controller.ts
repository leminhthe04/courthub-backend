import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { CurrentUser } from '../../common/current-user.decorator';
import type { AuthUser } from '../../common/auth.types';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { EnvConfig } from '../../config/env-config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: EnvConfig,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.register(dto);
    response.cookie('access_token', session.accessToken, this.cookieOptions());
    return { user: session.user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(dto);
    response.cookie('access_token', session.accessToken, this.cookieOptions());
    return { user: session.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', this.cookieOptions());
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    return { user: await this.auth.getMe(user.userId) };
  }

  private cookieOptions() {
    const production = this.config.nodeEnv === 'production';
    return {
      httpOnly: true,
      sameSite: production ? ('none' as const) : ('lax' as const),
      secure: production,
      maxAge: 1000 * 60 * 60 * 24,
    };
  }
}
