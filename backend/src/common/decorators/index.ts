import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Request } from 'express';

// ── @Public() ───────────────────────────────────────────────────────────────
// Marca rotas que não precisam de autenticação JWT
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(IS_PUBLIC_KEY, true);

// ── @CurrentUser() ──────────────────────────────────────────────────────────
// Extrai o usuário autenticado do request (injetado pelo JwtStrategy)
export interface JwtPayload {
  sub: string;   // userId
  email: string;
  plan: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    return request.user;
  },
);
