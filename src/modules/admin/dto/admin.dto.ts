import { IsIn } from 'class-validator';

// Request contracts for administration endpoints.

export class UpdateUserRoleDto {
  @IsIn(['CUSTOMER', 'PARTNER', 'ADMIN'])
  role!: 'CUSTOMER' | 'PARTNER' | 'ADMIN';
}
