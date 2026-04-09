export class CategoryResponseDto {
  id!: string;
  name!: string;
  icon!: string | null;
  color!: string | null;
  isSystem!: boolean;
  userId!: string | null;
  createdAt!: Date;
}
