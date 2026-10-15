import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import type { AuthUser } from '../../common/auth.types';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('webhook')
  webhook(@Body() payload: unknown) {
    return this.payments.handleWebhook(payload);
  }

  @Get(':id/status')
  status(@Param('id') id: string) {
    return this.payments.getStatus(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.payments.cancel(id);
  }

  @Post(':id/retry')
  @UseGuards(JwtAuthGuard)
  retry(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.payments.retry(id, user.userId);
  }
}
