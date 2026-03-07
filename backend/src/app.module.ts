import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    // ── Config global ───────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Database ────────────────────────────────────────────────
    PrismaModule,

    // ── Feature modules (serão adicionados nas próximas fases) ──
    // AuthModule,
    // UsersModule,
    // TransactionsModule,
    // CategoriesModule,
    // GoalsModule,
    // ReportsModule,
  ],
})
export class AppModule {}
