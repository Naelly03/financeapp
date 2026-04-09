import { IsNumber, IsInt, IsString, IsPositive, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;

  @IsString()
  categoryId!: string;
}
