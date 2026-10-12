import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { VenuesModule } from './modules/venues/venues.module';
import { HealthController } from './health.controller';
import { EnvConfigModule } from './config/env-config.module';

@Module({
  imports: [
    EnvConfigModule,
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    VenuesModule,
    BookingsModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
