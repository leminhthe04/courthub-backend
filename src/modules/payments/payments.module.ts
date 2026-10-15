import { Module } from '@nestjs/common';
import { EnvConfigModule } from '../../config/env-config.module';
import { PaymentsController } from './payments.controller';
import { PaymentsGateway } from './payments.gateway';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PayOSService } from './payos.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [EnvConfigModule, AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsRepository, PaymentsService, PayOSService, PaymentsGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}
