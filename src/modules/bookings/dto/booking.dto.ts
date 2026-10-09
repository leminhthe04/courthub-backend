import { IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

// Request contracts for booking endpoints.

const phonePattern = /^\+?[0-9\s().-]{8,24}$/;

export class CreateBookingDto {
  @IsUUID()
  courtId!: string;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  guestName?: string;

  @IsOptional()
  @Matches(phonePattern, { message: 'contactPhone must be a valid phone number' })
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  guestToken?: string;
}

export class RejectBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
