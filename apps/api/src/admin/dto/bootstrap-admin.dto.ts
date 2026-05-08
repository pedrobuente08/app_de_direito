import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class BootstrapAdminDto {
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  secret!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  senha!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nome!: string;
}
