import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const systemCategories = [
  // Despesas
  { name: 'Alimentação', icon: '🍔', color: '#EF4444', isSystem: true },
  { name: 'Transporte', icon: '🚗', color: '#F97316', isSystem: true },
  { name: 'Moradia', icon: '🏠', color: '#EAB308', isSystem: true },
  { name: 'Saúde', icon: '❤️', color: '#22C55E', isSystem: true },
  { name: 'Educação', icon: '📚', color: '#3B82F6', isSystem: true },
  { name: 'Lazer', icon: '🎮', color: '#8B5CF6', isSystem: true },
  { name: 'Vestuário', icon: '👕', color: '#EC4899', isSystem: true },
  { name: 'Outros', icon: '📦', color: '#6B7280', isSystem: true },
  // Receitas
  { name: 'Salário', icon: '💼', color: '#10B981', isSystem: true },
  { name: 'Freelance', icon: '💻', color: '#06B6D4', isSystem: true },
  { name: 'Investimentos', icon: '📈', color: '#84CC16', isSystem: true },
  { name: 'Presente', icon: '🎁', color: '#F59E0B', isSystem: true },
];

async function main(): Promise<void> {
  console.log('🌱 Seeding system categories...');

  for (const category of systemCategories) {
    await prisma.category.upsert({
      where: { name_userId: { name: category.name, userId: '' } },
      update: {},
      create: { ...category, userId: null },
    });
  }

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
