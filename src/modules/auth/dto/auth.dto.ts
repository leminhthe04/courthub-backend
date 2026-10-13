import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

// Request contracts for authentication endpoints.

const phonePattern = /^\+?[0-9\s().-]{8,24}$/;

export class RegisterDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @Matches(phonePattern, { message: 'phone must be a valid phone number' })
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginDto {
  @IsString()
  identifier!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @Matches(phonePattern, { message: 'phone must be a valid phone number' })
  phone?: string;
}

export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
