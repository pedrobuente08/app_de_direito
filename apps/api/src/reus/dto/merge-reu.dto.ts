import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class MergeReuDto {
  @IsUUID('4')
  destinoId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  origemIds!: string[];
}
