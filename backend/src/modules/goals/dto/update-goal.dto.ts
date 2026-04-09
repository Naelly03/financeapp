import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;
}
