class CategorySummary {
  id!: string;
  name!: string;
  icon!: string | null;
  color!: string | null;
}

export class GoalResponseDto {
  id!: string;
  amount!: string;
  month!: number;
  year!: number;
  categoryId!: string;
  category!: CategorySummary;
  spent!: string;
  notified!: boolean;
  createdAt!: Date;
}
