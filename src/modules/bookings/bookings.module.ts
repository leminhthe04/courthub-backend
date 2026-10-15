import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/roles.guard';
import { BookingsController, PartnerBookingsController } from './bookings.controller';
import { BookingsRepository } from './bookings.repository';
import { BookingsService } from './bookings.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [BookingsController, PartnerBookingsController],
  providers: [BookingsRepository, BookingsService, RolesGuard],
  exports: [BookingsService],
})
export class BookingsModule {}
