import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto, UpdateUserStatusDto } from './dto/admin.dto';
import { CurrentUser } from '../../common/current-user.decorator';
import type { AuthUser } from '../../common/auth.types';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Get('venues')
  venues() {
    return this.admin.listVenues();
  }

  @Patch('users/:id/role')
  updateUserRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.admin.updateUserRole(id, dto.role);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.admin.updateUserStatus(user.userId, id, dto.isActive);
  }

  @Post('venues/:id/approve')
  approveVenue(@Param('id') id: string) {
    return this.admin.reviewVenue(id, 'APPROVED');
  }

  @Post('venues/:id/reject')
  rejectVenue(@Param('id') id: string) {
    return this.admin.reviewVenue(id, 'REJECTED');
  }

  @Get('bookings')
  bookings() {
    return this.admin.listBookings();
  }
}
