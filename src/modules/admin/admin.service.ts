import { Injectable } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';
import { VenuesService } from '../venues/venues.service';
import { AdminRepository } from './admin.repository';

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

  updateUserRole(id: string, role: 'CUSTOMER' | 'PARTNER' | 'ADMIN') {
    return this.repository.updateUserRole(id, role);
  }
}
