'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth.store';
import { CheckoutResponse } from '../../../types/api';

const FREE_FEATURES = [
  'Até 50 transações por mês',
  'Categorias padrão',
  'Resumo mensal',
  'Metas de gastos',
];

const PREMIUM_FEATURES = [
  'Transações ilimitadas',
  'Categorias personalizadas',
  'Resumo mensal detalhado',
  'Metas de gastos avançadas',
  'Relatórios e gráficos',
  'Suporte prioritário',
];

export default function BillingPage() {
  const { user } = useAuthStore();
  const isPremium = user?.plan === 'PREMIUM';
  const [error, setError] = useState<string | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api.post<CheckoutResponse>('/billing/checkout').then((r) => r.data),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      setError('Não foi possível iniciar o checkout. Tente novamente.');
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      api.post<CheckoutResponse>('/billing/portal').then((r) => r.data),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      setError('Não foi possível acessar o portal. Tente novamente.');
    },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Plano</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gerencie sua assinatura do FinanceApp
        </p>
      </div>

      {/* Current plan badge */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Plano atual</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {isPremium ? 'Premium' : 'Gratuito'}
            </span>
            {isPremium ? (
              <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                ✦ Ativo
              </span>
            ) : (
              <span className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                Gratuito
              </span>
            )}
          </div>
        </div>
        {isPremium ? (
          <button
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {portalMutation.isPending ? 'Abrindo...' : 'Gerenciar assinatura'}
          </button>
        ) : null}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 4.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="9.5" r="0.75" fill="currentColor" />
          </svg>
          {error}
        </div>
      )}

      {/* Plan comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Free */}
        <div
          className={`bg-white dark:bg-zinc-900 rounded-2xl border p-6 flex flex-col ${
            !isPremium
              ? 'border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100'
              : 'border-zinc-200 dark:border-zinc-800'
          }`}
        >
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Gratuito</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
              R$ 0
              <span className="text-base font-normal text-zinc-400">/mês</span>
            </p>
          </div>

          <ul className="flex flex-col gap-2.5 flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                  <circle cx="8" cy="8" r="7" fill="#f4f4f5" />
                  <path
                    d="M5 8l2 2 4-4"
                    stroke="#71717a"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{f}</span>
              </li>
            ))}
          </ul>

          {!isPremium && (
            <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
              <div className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-500 text-center">
                Plano atual
              </div>
            </div>
          )}
        </div>

        {/* Premium */}
        <div
          className={`rounded-2xl border p-6 flex flex-col relative overflow-hidden ${
            isPremium
              ? 'bg-white dark:bg-zinc-900 border-emerald-500 ring-1 ring-emerald-500'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          }`}
        >
          {/* Badge */}
          <div className="absolute top-4 right-4">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-2 py-1 rounded-full">
              Popular
            </span>
          </div>

          <div className="mb-4">
            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Premium</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
              R$ 19
              <span className="text-base font-normal text-zinc-400">/mês</span>
            </p>
          </div>

          <ul className="flex flex-col gap-2.5 flex-1">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                  <circle cx="8" cy="8" r="7" fill="#d1fae5" />
                  <path
                    d="M5 8l2 2 4-4"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
            {isPremium ? (
              <div className="w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-sm font-medium text-emerald-700 dark:text-emerald-400 text-center">
                ✦ Plano atual
              </div>
            ) : (
              <button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {checkoutMutation.isPending ? 'Redirecionando...' : 'Assinar Premium'}
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-400 text-center mt-5">
        Pagamentos processados com segurança via Stripe. Cancele quando quiser.
      </p>
    </div>
  );
}
