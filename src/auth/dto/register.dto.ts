import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Kullanıcı e-posta adresi' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Passw0rd!', description: 'Şifre (en az 6 karakter)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
