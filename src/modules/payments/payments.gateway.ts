import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PaymentsRepository } from './payments.repository';

@WebSocketGateway({ namespace: '/payments', cors: { origin: true, credentials: true } })
export class PaymentsGateway {
  @WebSocketServer() server!: Server;

  constructor(private readonly repository: PaymentsRepository) {}

  @SubscribeMessage('payment:subscribe')
  async subscribe(@ConnectedSocket() socket: Socket, @MessageBody() body: { paymentId?: string }) {
    if (!body?.paymentId) return { ok: false };
    const payment = await this.repository.findById(body.paymentId);
    if (!payment) return { ok: false };
    await socket.join(this.room(body.paymentId));
    socket.emit('payment:updated', this.publicPayment(payment));
    return { ok: true };
  }

  emitPaymentUpdated(payment: {
    id: string;
    bookingId: string;
    status: string;
    amount: number;
    expiresAt: Date;
  }) {
    this.server.to(this.room(payment.id)).emit('payment:updated', this.publicPayment(payment));
  }

  private room(paymentId: string) {
    return `payment:${paymentId}`;
  }

  private publicPayment(payment: {
    id: string;
    bookingId: string;
    status: string;
    amount: number;
    expiresAt: Date;
  }) {
    return {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      status: payment.status,
      amount: payment.amount,
      expiresAt: payment.expiresAt,
    };
  }
}
