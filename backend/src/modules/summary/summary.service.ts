import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface SummaryResult {
  month: number;
  year: number;
  income: string;
  expenses: string;
  balance: string;
  transactionCount: number;
}

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, month: number, year: number): Promise<SummaryResult> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const where = {
      userId,
      date: { gte: startOfMonth, lte: endOfMonth },
    };

    const [incomeAgg, expensesAgg, transactionCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.EXPENSE },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expenses = Number(expensesAgg._sum.amount ?? 0);

    return {
      month,
      year,
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      balance: (income - expenses).toFixed(2),
      transactionCount,
    };
  }
}
