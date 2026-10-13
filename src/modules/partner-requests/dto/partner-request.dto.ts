import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePartnerRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
