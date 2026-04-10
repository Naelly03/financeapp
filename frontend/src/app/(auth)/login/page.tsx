'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth.store';
import { AuthResponse } from '../../../types/api';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      const res = await api.post<AuthResponse>('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      router.push('/dashboard');
    } catch {
      setError('Email ou senha inválidos');
    }
  };

  return (
    <div className="w-full">
      {/* Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Boas-vindas de volta
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Não tem conta?{' '}
            <Link href="/register" className="text-emerald-600 hover:text-emerald-500 font-medium transition-colors">
              Criar agora
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 4.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="7" cy="9.5" r="0.75" fill="currentColor"/>
              </svg>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="voce@email.com"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
            {errors.email && (
              <span className="text-xs text-red-500">{errors.email.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Senha
              </label>
              <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                Esqueceu a senha?
              </Link>
            </div>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
            {errors.password && (
              <span className="text-xs text-red-500">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 text-sm transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
