import { IsUUID } from 'class-validator';
import { CreateSentencaDto } from './create-sentenca.dto';

export class CreateSentencaBodyDto extends CreateSentencaDto {
  @IsUUID('4')
  processoId!: string;
}
