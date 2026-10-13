import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import type { AuthUser } from '../../common/auth.types';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { PartnerRequestsService } from './partner-requests.service';

@Controller('admin/partner-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PartnerRequestsAdminController {
  constructor(private readonly service: PartnerRequestsService) {}

  @Get()
  list() {
    return this.service.listAll();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.review(id, 'APPROVED', user.userId);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.review(id, 'REJECTED', user.userId);
  }
}
