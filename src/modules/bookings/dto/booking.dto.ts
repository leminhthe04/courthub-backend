import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

// Request contracts for booking endpoints.

const phonePattern = /^\+?[0-9\s().-]{8,24}$/;

export class CreateBookingDto {
  @IsUUID()
  courtId!: string;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsString()
  @MaxLength(120)
  contactName!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @Matches(phonePattern, { message: 'contactPhone must be a valid phone number' })
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
