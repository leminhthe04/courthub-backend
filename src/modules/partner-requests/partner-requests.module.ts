import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../../common/roles.guard';
import { PartnerRequestsAdminController } from './partner-requests-admin.controller';
import { PartnerRequestsController } from './partner-requests.controller';
import { PartnerRequestsRepository } from './partner-requests.repository';
import { PartnerRequestsService } from './partner-requests.service';

@Module({
  imports: [AuthModule],
  controllers: [PartnerRequestsController, PartnerRequestsAdminController],
  providers: [PartnerRequestsRepository, PartnerRequestsService, RolesGuard],
})
export class PartnerRequestsModule {}
