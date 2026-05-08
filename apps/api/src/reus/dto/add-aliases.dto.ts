import { ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';

export class AddAliasesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  aliases!: string[];
}
