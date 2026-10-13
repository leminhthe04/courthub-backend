import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { createUuidV7 } from '../../common/uuid';
import { AuthRepository } from '../auth/auth.repository';
import { PartnerRequestsRepository } from './partner-requests.repository';

@Injectable()
export class PartnerRequestsService {
  constructor(
    private readonly repository: PartnerRequestsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async submit(userId: string, message?: string) {
    const user = await this.authRepository.findById(userId);
    if (!user || user.role !== 'CUSTOMER') {
      throw new ForbiddenException({ code: ErrorCode.PARTNER_REQUEST_FORBIDDEN });
    }

    const existing = await this.repository.findByUserId(userId);
    if (existing?.status === 'PENDING') {
      throw new ConflictException({ code: ErrorCode.PARTNER_REQUEST_ALREADY_PENDING });
    }

    const normalizedMessage = message?.trim() || null;
    if (existing) return this.repository.resubmit(existing.id, normalizedMessage);

    return this.repository.create({
      id: createUuidV7(),
      userId,
      message: normalizedMessage,
      status: 'PENDING',
    });
  }

  async getMine(userId: string) {
    return this.repository.findByUserId(userId);
  }

  listAll() {
    return this.repository.listAll();
  }

  async review(id: string, status: 'APPROVED' | 'REJECTED', reviewerId: string) {
    const request = await this.repository.review(id, status, reviewerId);
    if (!request) {
      throw new NotFoundException({ code: ErrorCode.PARTNER_REQUEST_NOT_FOUND });
    }
    return request;
  }
}
