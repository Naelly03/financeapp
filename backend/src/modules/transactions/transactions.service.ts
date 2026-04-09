import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';

const CATEGORY_SELECT = { id: true, name: true, icon: true, color: true };

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(
    userId: string,
    filters: TransactionFiltersDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, month, year, type, categoryId } = filters;

    const where: any = { userId };
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (month && year) {
      where.date = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0, 23, 59, 59, 999),
      };
    } else if (year) {
      where.date = {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: { select: CATEGORY_SELECT } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async create(userId: string, plan: string, dto: CreateTransactionDto): Promise<any> {
    if (plan === 'FREE') {
      await this.checkFreePlanLimit(userId, new Date(dto.date));
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        amount: dto.amount,
        type: dto.type,
        description: dto.description,
        date: new Date(dto.date),
        userId,
        categoryId: dto.categoryId,
      },
      include: { category: { select: CATEGORY_SELECT } },
    });

    if (dto.type === TransactionType.EXPENSE) {
      await this.checkGoalNotification(userId, dto.categoryId, new Date(dto.date));
    }

    return transaction;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto): Promise<any> {
    const transaction = await this.findOwnOrThrow(userId, id);

    const updated = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      },
      include: { category: { select: CATEGORY_SELECT } },
    });

    const effectiveType = dto.type ?? transaction.type;
    const effectiveCategoryId = dto.categoryId ?? transaction.categoryId;
    const effectiveDate = dto.date ? new Date(dto.date) : transaction.date;

    if (effectiveType === TransactionType.EXPENSE) {
      await this.checkGoalNotification(userId, effectiveCategoryId, effectiveDate);
    }

    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    const transaction = await this.findOwnOrThrow(userId, id);
    await this.prisma.transaction.delete({ where: { id: transaction.id } });
  }

  // ── Helpers privados ────────────────────────────────────────────────────────

  private async findOwnOrThrow(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('Transação não encontrada');
    if (transaction.userId !== userId) throw new ForbiddenException('Acesso negado');
    return transaction;
  }

  private async checkFreePlanLimit(userId: string, date: Date): Promise<void> {
    const max = this.configService.get<number>('app.freePlan.maxTransactionsPerMonth')!;
    const month = date.getMonth();
    const year = date.getFullYear();

    const count = await this.prisma.transaction.count({
      where: {
        userId,
        date: {
          gte: new Date(year, month, 1),
          lte: new Date(year, month + 1, 0, 23, 59, 59, 999),
        },
      },
    });

    if (count >= max) {
      throw new ForbiddenException(
        `Limite de ${max} transações por mês do plano FREE atingido`,
      );
    }
  }

  private async checkGoalNotification(
    userId: string,
    categoryId: string,
    date: Date,
  ): Promise<void> {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const goal = await this.prisma.goal.findUnique({
      where: { userId_categoryId_month_year: { userId, categoryId, month, year } },
    });

    if (!goal || goal.notified) return;

    const agg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        type: TransactionType.EXPENSE,
        date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
      },
      _sum: { amount: true },
    });

    const spent = agg._sum.amount ?? 0;
    if (Number(spent) >= Number(goal.amount)) {
      await this.prisma.goal.update({
        where: { id: goal.id },
        data: { notified: true },
      });
    }
  }
}
