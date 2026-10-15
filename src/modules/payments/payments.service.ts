import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createUuidV7 } from '../../common/uuid';
import { EnvConfig } from '../../config/env-config';
import { PaymentsGateway } from './payments.gateway';
import { PaymentsRepository } from './payments.repository';
import { PayOSService } from './payos.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly payos: PayOSService,
    private readonly gateway: PaymentsGateway,
    private readonly config: EnvConfig,
  ) {}

  async createForBooking(input: {
    bookingId: string;
    amount: number;
    description: string;
    contactName: string;
    contactEmail?: string | null;
    contactPhone?: string;
  }) {
    await this.repository.expireDue();
    const paymentId = createUuidV7();
    const orderCode = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-15);
    const expiresAt = new Date(Date.now() + this.config.paymentHoldMinutes * 60 * 1000);
    const returnUrl = new URL(this.config.payosReturnUrl);
    returnUrl.searchParams.set('paymentId', paymentId);
    const cancelUrl = new URL(this.config.payosCancelUrl);
    cancelUrl.searchParams.set('paymentId', paymentId);
    const payosLink = await this.payos.createPaymentLink({
      orderCode: Number(orderCode),
      amount: Math.round(input.amount),
      description: input.description.slice(0, 25),
      returnUrl: returnUrl.toString(),
      cancelUrl: cancelUrl.toString(),
      expiredAt: Math.floor(expiresAt.getTime() / 1000),
      buyerName: input.contactName,
      buyerEmail: input.contactEmail || undefined,
      buyerPhone: input.contactPhone,
      items: [
        { name: input.description.slice(0, 25), quantity: 1, price: Math.round(input.amount) },
      ],
    });
    const payment = await this.repository.create({
      id: paymentId,
      bookingId: input.bookingId,
      payosOrderCode: orderCode,
      amount: Math.round(input.amount),
      status: 'PENDING',
      checkoutUrl: payosLink.checkoutUrl,
      expiresAt,
    });
    return { payment, checkoutUrl: payosLink.checkoutUrl };
  }

  async getStatus(id: string) {
    await this.repository.expireDue();
    const payment = await this.repository.findPaymentDetails(id);
    if (!payment) throw new NotFoundException('Payment not found');
    return this.publicPayment(payment);
  }

  async retry(paymentId: string, customerId: string) {
    const row = await this.repository.findPendingForCustomer(paymentId, customerId);
    if (!row) throw new NotFoundException('Payment not found');
    if (row.payment.status !== 'PENDING' || row.bookingStatus !== 'AWAITING_PAYMENT') {
      throw new BadRequestException('This payment is no longer available');
    }
    if (new Date(row.payment.expiresAt) <= new Date()) {
      await this.repository.expireDue();
      throw new BadRequestException('This payment has expired');
    }
    const payment = await this.repository.findPaymentDetails(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    return this.publicPayment(payment);
  }

  async cancel(paymentId: string) {
    const result = await this.repository.cancelPending(paymentId);
    if (!result) throw new NotFoundException('Payment not found');
    if (result.changed) this.gateway.emitPaymentUpdated(result.payment);
    const payment = await this.repository.findPaymentDetails(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    return this.publicPayment(payment);
  }

  async handleWebhook(payload: any) {
    if (payload.data.orderCode === 123) {
      // payOS requires to the first connection
      return { ok: true };
    }

    const verified = await this.payos.verifyWebhook(
      payload as Parameters<PayOSService['verifyWebhook']>[0],
    );
    const updated = await this.repository.applyWebhook(
      String(verified.orderCode),
      Number(verified.amount),
      verified.code === '00',
    );

    if (!updated) throw new BadRequestException('Payment not found or amount mismatch');
    this.gateway.emitPaymentUpdated(updated);
    return { ok: true };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expirePayments() {
    return this.repository.expireDue();
  }

  private publicPayment(payment: {
    payment: {
      id: string;
      bookingId: string;
      status: string;
      amount: number;
      expiresAt: Date;
      checkoutUrl: string;
    };
    bookingId: string;
    bookingStatus: string;
    contactName: string;
    contactEmail: string | null;
    contactPhone: string;
    startAt: Date;
    endAt: Date;
    bookingCreatedAt: Date;
    courtId: string;
    courtName: string;
    venueId: string;
    venueName: string;
    venueAddress: string;
    venueWard: string;
    venueProvince: string;
  }) {
    return {
      paymentId: payment.payment.id,
      bookingId: payment.bookingId,
      status: payment.payment.status,
      amount: payment.payment.amount,
      expiresAt: payment.payment.expiresAt,
      checkoutUrl: payment.payment.checkoutUrl,
      bookingStatus: payment.bookingStatus,
      contactName: payment.contactName,
      contactEmail: payment.contactEmail,
      contactPhone: payment.contactPhone,
      startAt: payment.startAt,
      endAt: payment.endAt,
      createdAt: payment.bookingCreatedAt,
      court: {
        id: payment.courtId,
        name: payment.courtName,
      },
      venue: {
        id: payment.venueId,
        name: payment.venueName,
        address: payment.venueAddress,
        ward: payment.venueWard,
        province: payment.venueProvince,
      },
    };
  }
}
