import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/roles.guard';
import { VenuesController, PartnerVenuesController } from './venues.controller';
import { VenuesRepository } from './venues.repository';
import { VenuesService } from './venues.service';

@Module({
  controllers: [VenuesController, PartnerVenuesController],
  providers: [VenuesRepository, VenuesService, RolesGuard],
  exports: [VenuesService],
})
export class VenuesModule {}
