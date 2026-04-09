import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { TransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalResponseDto } from './dto/goal-response.dto';

const CATEGORY_SELECT = { id: true, name: true, icon: true, color: true };

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, month: number, year: number): Promise<GoalResponseDto[]> {
    const goals = await this.prisma.goal.findMany({
      where: { userId, month, year },
      include: { category: { select: CATEGORY_SELECT } },
      orderBy: { createdAt: 'asc' },
    });

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const goalsWithSpent = await Promise.all(
      goals.map(async (goal) => {
        const agg = await this.prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: goal.categoryId,
            type: TransactionType.EXPENSE,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        });
        return {
          ...goal,
          spent: (agg._sum.amount ?? new Prisma.Decimal(0)).toString(),
          amount: goal.amount.toString(),
        };
      }),
    );

    return goalsWithSpent as unknown as GoalResponseDto[];
  }

  async create(userId: string, dto: CreateGoalDto): Promise<GoalResponseDto> {
    try {
      const goal = await this.prisma.goal.create({
        data: {
          amount: dto.amount,
          month: dto.month,
          year: dto.year,
          userId,
          categoryId: dto.categoryId,
        },
        include: { category: { select: CATEGORY_SELECT } },
      });
      return { ...goal, amount: goal.amount.toString(), spent: '0' } as unknown as GoalResponseDto;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Já existe uma meta para essa categoria neste mês');
      }
      throw err;
    }
  }

  async update(userId: string, id: string, dto: UpdateGoalDto): Promise<GoalResponseDto> {
    const goal = await this.findOwnOrThrow(userId, id);

    const updated = await this.prisma.goal.update({
      where: { id: goal.id },
      data: { amount: dto.amount },
      include: { category: { select: CATEGORY_SELECT } },
    });

    return { ...updated, amount: updated.amount.toString(), spent: '0' } as unknown as GoalResponseDto;
  }

  async remove(userId: string, id: string): Promise<void> {
    const goal = await this.findOwnOrThrow(userId, id);
    await this.prisma.goal.delete({ where: { id: goal.id } });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async findOwnOrThrow(userId: string, id: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Meta não encontrada');
    if (goal.userId !== userId) throw new ForbiddenException('Acesso negado');
    return goal;
  }
}
