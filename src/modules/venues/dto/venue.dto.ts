import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Request contracts for venue and court endpoints.

export class ListVenueDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  sportType?: string;
}

export class CreateVenueDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(60)
  sportType!: string;

  @IsString()
  @MaxLength(255)
  address!: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CreateCourtDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0)
  hourlyRate!: number;
}

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetOperatingHoursDto {
  @IsBoolean()
  isClosed!: boolean;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'openTime must use HH:mm' })
  openTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'closeTime must use HH:mm' })
  closeTime?: string;
}

export class DayOfWeekParamDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;
}
