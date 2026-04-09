import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<CategoryResponseDto[]> {
    return this.prisma.category.findMany({
      where: {
        OR: [{ isSystem: true }, { userId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        userId,
        isSystem: false,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.findOwnOrThrow(userId, id);

    return this.prisma.category.update({
      where: { id: category.id },
      data: dto,
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const category = await this.findOwnOrThrow(userId, id);

    try {
      await this.prisma.category.delete({ where: { id: category.id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException(
          'Categoria possui transações ou metas vinculadas e não pode ser removida',
        );
      }
      throw err;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async findOwnOrThrow(userId: string, id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    if (category.isSystem) {
      throw new ForbiddenException('Categorias do sistema não podem ser modificadas');
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return category;
  }
}
