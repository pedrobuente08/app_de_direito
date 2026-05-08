import { IsString, MaxLength, MinLength } from 'class-validator';

export class CadastrarOabDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  oab!: string;
}
