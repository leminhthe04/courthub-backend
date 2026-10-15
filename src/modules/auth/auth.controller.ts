import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import type { Profile } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import {
  ConfirmPasswordResetDto,
  LoginDto,
  RegisterDto,
  RequestPasswordResetDto,
  UpdateProfileDto,
} from './dto/auth.dto';
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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport redirects the request to Google.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: Profile },
    @Res({ passthrough: true }) response: Response,
  ) {
    const { userAgent, ipAddress } = this.getClientInfo(req);
    const session = await this.auth.loginWithGoogle(req.user, userAgent, ipAddress);
    this.setAuthCookies(response, session);
    response.redirect(this.config.frontendUrls[0]);
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

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    const updated = await this.auth.updateProfile(user.userId, dto);
    return { user: updated };
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Post('password-reset/request-me')
  @UseGuards(JwtAuthGuard)
  requestPasswordResetForUser(@CurrentUser() user: AuthUser) {
    return this.auth.requestPasswordResetForUser(user.userId);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.auth.confirmPasswordReset(dto);
  }

  private setAuthCookies(
    response: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const { sameSite, secure } = this.config.cookieOptions;

    // 1. Access Token: short-lived (15m), HttpOnly, sent to all paths
    response.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      sameSite,
      secure,
      path: '/',
      maxAge: this.config.accessTokenTtlMinutes * 60 * 1000,
    });

    // 2. Refresh Token: long-lived (7d), HttpOnly, scoped strictly to /api/auth
    response.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite,
      secure,
      path: '/api/auth',
      maxAge: this.config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(response: Response) {
    const { sameSite, secure } = this.config.cookieOptions;

    response.clearCookie('access_token', {
      httpOnly: true,
      sameSite,
      secure,
      path: '/',
    });
    response.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite,
      secure,
      path: '/api/auth',
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
