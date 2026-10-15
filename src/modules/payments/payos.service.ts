import { Injectable } from '@nestjs/common';
import { PayOS } from '@payos/node';
import { EnvConfig } from '../../config/env-config';

@Injectable()
export class PayOSService {
  private readonly client: PayOS;

  constructor(private readonly config: EnvConfig) {
    void config.payosReturnUrl;
    void config.payosCancelUrl;
    void config.payosWebhookUrl;
    void config.paymentHoldMinutes;
    this.client = new PayOS({
      clientId: config.payosClientId,
      apiKey: config.payosApiKey,
      checksumKey: config.payosChecksumKey,
    });
  }

  createPaymentLink(input: Parameters<PayOS['paymentRequests']['create']>[0]) {
    return this.client.paymentRequests.create(input);
  }

  verifyWebhook(payload: Parameters<PayOS['webhooks']['verify']>[0]) {
    return this.client.webhooks.verify(payload);
  }
}
