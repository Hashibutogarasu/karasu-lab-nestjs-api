import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  oldPassword: string;
  newPassword: string;
}

export class ConfirmResetPasswordDto {
  resetCode: string;
  newPassword: string;
}
