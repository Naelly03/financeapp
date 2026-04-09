import { Plan } from '@prisma/client';

export class UserResponseDto {
  id!: string;
  name!: string;
  email!: string;
  plan!: Plan;
  createdAt!: Date;
}
