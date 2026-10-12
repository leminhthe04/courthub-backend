import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
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
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { userAgent, ipAddress } = this.getClientInfo(req);
    const session = await this.auth.register(dto, userAgent, ipAddress);
    this.setAuthCookies(response, session);
    return { user: session.user };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { userAgent, ipAddress } = this.getClientInfo(req);
    const session = await this.auth.login(dto, userAgent, ipAddress);
    this.setAuthCookies(response, session);
    return { user: session.user };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = (req.cookies?.refresh_token as string) || '';
    const { userAgent, ipAddress } = this.getClientInfo(req);
    try {
      const session = await this.auth.refresh(refreshToken, userAgent, ipAddress);
      this.setAuthCookies(response, session);
      return { user: session.user };
    } catch (error) {
      this.clearAuthCookies(response);
      throw error;
    }
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = (req.cookies?.refresh_token as string) || undefined;
    await this.auth.logout(refreshToken);
    this.clearAuthCookies(response);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    return { user: await this.auth.getMe(user.userId) };
  }

  private setAuthCookies(
    response: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const isProduction = this.config.nodeEnv === 'production';
    const sameSite = isProduction ? ('none' as const) : ('lax' as const);

    // 1. Access Token: short-lived (15m), HttpOnly, sent to all paths
    response.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      sameSite,
      secure: isProduction,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    // 2. Refresh Token: long-lived (7d), HttpOnly, scoped strictly to /api/auth
    response.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite,
      secure: isProduction,
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 3. Session Presence Cookie: long-lived (7d), non-HttpOnly, client UI hint
    response.cookie('has_session', '1', {
      httpOnly: false,
      sameSite,
      secure: isProduction,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(response: Response) {
    const isProduction = this.config.nodeEnv === 'production';
    const sameSite = isProduction ? ('none' as const) : ('lax' as const);

    response.clearCookie('access_token', {
      httpOnly: true,
      sameSite,
      secure: isProduction,
      path: '/',
    });
    response.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite,
      secure: isProduction,
      path: '/api/auth',
    });
    response.clearCookie('has_session', {
      httpOnly: false,
      sameSite,
      secure: isProduction,
      path: '/',
    });
  }

  private getClientInfo(req: Request) {
    const userAgent = req.headers['user-agent'];
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip) || undefined;
    return { userAgent, ipAddress };
  }
}
