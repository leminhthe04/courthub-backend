import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Request contracts for venue and court endpoints.

export class ListVenueDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  sportType?: string;
}

export class CreateVenueDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

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
}

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateVenuePricingRuleDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must use HH:mm' })
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must use HH:mm' })
  endTime!: string;

  @IsNumber()
  @Min(0)
  hourlyRate!: number;
}

export class SetVenuePricingRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVenuePricingRuleDto)
  rules!: CreateVenuePricingRuleDto[];
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
