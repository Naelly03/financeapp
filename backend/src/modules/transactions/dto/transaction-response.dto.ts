import { TransactionType } from '@prisma/client';

class CategorySummary {
  id!: string;
  name!: string;
  icon!: string | null;
  color!: string | null;
}

export class TransactionResponseDto {
  id!: string;
  amount!: string; // Decimal serializado como string
  type!: TransactionType;
  description!: string | null;
  date!: Date;
  categoryId!: string;
  category!: CategorySummary;
  userId!: string;
  createdAt!: Date;
}
