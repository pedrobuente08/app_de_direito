import { IsEmail, MaxLength } from 'class-validator';

export class RecuperarSenhaDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;
}
