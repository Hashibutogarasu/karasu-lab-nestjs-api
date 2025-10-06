export class ForgotPasswordDto {
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

export class GetUserProfileDto {
  userId: string;
}
