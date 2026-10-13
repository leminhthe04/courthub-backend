import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import type { AuthUser } from '../../common/auth.types';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { CreatePartnerRequestDto } from './dto/partner-request.dto';
import { PartnerRequestsService } from './partner-requests.service';

@Controller('partner-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class PartnerRequestsController {
  constructor(private readonly service: PartnerRequestsService) {}

  @Post()
  submit(@CurrentUser() user: AuthUser, @Body() dto: CreatePartnerRequestDto) {
    return this.service.submit(user.userId, dto.message);
  }

  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.service.getMine(user.userId);
  }
}
