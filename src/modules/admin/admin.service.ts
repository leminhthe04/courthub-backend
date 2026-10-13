import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';
import { VenuesService } from '../venues/venues.service';
import { AdminRepository } from './admin.repository';
import { ErrorCode } from '../../common/error-codes';

@Injectable()
export class AdminService {
  constructor(
    private readonly repository: AdminRepository,
    private readonly venues: VenuesService,
    private readonly bookings: BookingsService,
  ) {}

  listVenues() {
    return this.venues.listForAdmin();
  }

  reviewVenue(id: string, status: 'APPROVED' | 'REJECTED') {
    return this.venues.reviewVenue(id, status);
  }

  listBookings() {
    return this.bookings.listForAdmin();
  }

  listUsers() {
    return this.repository.listUsers();
  }

  async updateUserRole(id: string, role: 'CUSTOMER' | 'PARTNER' | 'ADMIN') {
    const target = await this.repository.findUser(id);
    if (!target) throw new NotFoundException({ code: ErrorCode.AUTH_ACCOUNT_NOT_FOUND });
    if (target.role === 'ADMIN' && role !== 'ADMIN' && target.isActive) {
      const activeAdmins = await this.repository.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new ConflictException({
          code: ErrorCode.AUTH_FORBIDDEN,
          message: 'At least one active admin is required',
        });
      }
    }
    return this.repository.updateUserRole(id, role);
  }

  async updateUserStatus(actorId: string, id: string, isActive: boolean) {
    const target = await this.repository.findUser(id);
    if (!target) throw new NotFoundException({ code: ErrorCode.AUTH_ACCOUNT_NOT_FOUND });
    if (!isActive && actorId === id) {
      throw new ForbiddenException({
        code: ErrorCode.AUTH_FORBIDDEN,
        message: 'You cannot deactivate yourself',
      });
    }
    if (!isActive && target.role === 'ADMIN' && target.isActive) {
      const activeAdmins = await this.repository.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new ConflictException({
          code: ErrorCode.AUTH_FORBIDDEN,
          message: 'At least one active admin is required',
        });
      }
    }
    return this.repository.updateUserStatus(id, isActive);
  }
}
