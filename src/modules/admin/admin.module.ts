import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { RolesGuard } from '../../common/roles.guard';
import { VenuesModule } from '../venues/venues.module';
import { AdminController } from './admin.controller';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

@Module({
  imports: [VenuesModule, BookingsModule],
  controllers: [AdminController],
  providers: [AdminRepository, AdminService, RolesGuard],
})
export class AdminModule {}
