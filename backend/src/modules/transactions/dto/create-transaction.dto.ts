import { IsNumber, IsEnum, IsOptional, IsString, IsDateString, MaxLength, IsPositive } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsDateString()
  date!: string;

  @IsString()
  categoryId!: string;
}
