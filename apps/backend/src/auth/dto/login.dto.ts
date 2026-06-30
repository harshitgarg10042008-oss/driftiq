import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  email: string; // Accepts both email or username

  @IsString()
  @IsNotEmpty()
  password: string;
}
