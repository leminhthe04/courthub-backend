import {
  IsArray,
  IsBoolean,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Max,
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
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
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
  @IsIn(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
  dayOfWeek!: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

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
