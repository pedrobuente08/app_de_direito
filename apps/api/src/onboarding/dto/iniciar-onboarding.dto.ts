import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class IniciarOnboardingDto {
  @IsString()
  @MaxLength(20)
  oab!: string;

  @IsString()
  @MaxLength(2)
  ufOab!: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(365)
  @IsIn([30, 90, 180, 365])
  diasJanela?: number;
}
