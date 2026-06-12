import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordConfirmDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
