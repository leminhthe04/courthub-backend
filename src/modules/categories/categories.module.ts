import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import { AdminCategoriesController, CategoriesController } from './categories.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesRepository, CategoriesService],
  exports: [CategoriesService, CategoriesRepository],
})
export class CategoriesModule {}
