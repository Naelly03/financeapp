'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth.store';
import { SummaryResult, TransactionResponse, PaginatedResult } from '../../../types/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: string | number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    typeof value === 'string' ? parseFloat(value) : value,
  );
}

function trendPct(curr: string, prev: string): number | null {
  const c = parseFloat(curr);
  const p = parseFloat(prev);
  if (!p) return null;
  return ((c - p) / Math.abs(p)) * 100;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_LONG = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const now = new Date();
const CUR_MONTH = now.getMonth() + 1;
const CUR_YEAR = now.getFullYear();
const PREV_MONTH = CUR_MONTH === 1 ? 12 : CUR_MONTH - 1;
const PREV_YEAR = CUR_MONTH === 1 ? CUR_YEAR - 1 : CUR_YEAR;

const chartMonths = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(CUR_YEAR, CUR_MONTH - 1 - (5 - i), 1);
  return { month: d.getMonth() + 1, year: d.getFullYear(), label: MONTHS_SHORT[d.getMonth()] };
});

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] ?? '';

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['summary', CUR_MONTH, CUR_YEAR],
    queryFn: () =>
      api.get<SummaryResult>(`/summary?month=${CUR_MONTH}&year=${CUR_YEAR}`).then((r) => r.data),
  });

  const { data: prevSummary } = useQuery({
    queryKey: ['summary', PREV_MONTH, PREV_YEAR],
    queryFn: () =>
      api.get<SummaryResult>(`/summary?month=${PREV_MONTH}&year=${PREV_YEAR}`).then((r) => r.data),
  });

  const { data: recentTx } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () =>
      api
        .get<PaginatedResult<TransactionResponse>>('/transactions?limit=6&page=1')
        .then((r) => r.data),
  });

  const { data: chartData } = useQuery({
    queryKey: ['summary-chart', CUR_MONTH, CUR_YEAR],
    queryFn: async () => {
      const results = await Promise.all(
        chartMonths.map((m) =>
          api
            .get<SummaryResult>(`/summary?month=${m.month}&year=${m.year}`)
            .then((r) => ({
              label: m.label,
              income: parseFloat(r.data.income),
              expenses: parseFloat(r.data.expenses),
            })),
        ),
      );
      return results;
    },
  });

  const incomeTrend = summary && prevSummary ? trendPct(summary.income, prevSummary.income) : null;
  const expenseTrend = summary && prevSummary ? trendPct(summary.expenses, prevSummary.expenses) : null;
  const balanceTrend = summary && prevSummary ? trendPct(summary.balance, prevSummary.balance) : null;
  const balance = summary ? parseFloat(summary.balance) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {greeting()}{firstName ? `, ${firstName}` : ''}!
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight mt-0.5">
          {MONTHS_LONG[CUR_MONTH - 1]} {CUR_YEAR}
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <SummaryCard
          label="Receitas"
          value={summary?.income ?? '0'}
          trend={incomeTrend}
          trendPositiveIsGood
          variant="income"
          loading={loadingSummary}
        />
        <SummaryCard
          label="Despesas"
          value={summary?.expenses ?? '0'}
          trend={expenseTrend}
          trendPositiveIsGood={false}
          variant="expense"
          loading={loadingSummary}
        />
        <SummaryCard
          label="Saldo"
          value={summary?.balance ?? '0'}
          trend={balanceTrend}
          trendPositiveIsGood
          variant={balance >= 0 ? 'balance-pos' : 'balance-neg'}
          loading={loadingSummary}
        />
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Evolução — últimos 6 meses
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-zinc-400">Receitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-xs text-zinc-400">Despesas</span>
              </div>
            </div>
          </div>

          {chartData ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgb(228 228 231 / 0.4)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                />
                <Tooltip
                  formatter={(v, name) => [
                    fmt(Number(v ?? 0)),
                    name === 'income' ? 'Receitas' : 'Despesas',
                  ]}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e4e4e7',
                    fontSize: 12,
                    padding: '8px 12px',
                    boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4, color: '#3f3f46' }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#incomeGrad)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f87171"
                  strokeWidth={2}
                  fill="url(#expensesGrad)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Últimas transações
            </h2>
            <Link
              href="/transactions"
              className="text-xs text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
            >
              Ver todas →
            </Link>
          </div>

          {recentTx?.data?.length ? (
            <div className="flex flex-col flex-1 justify-between">
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentTx.data.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                      style={{
                        backgroundColor: tx.category.color ? `${tx.category.color}22` : '#f4f4f5',
                      }}
                    >
                      {tx.category.icon ?? '💰'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate leading-tight">
                        {tx.description || tx.category.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {tx.category.name} · {new Date(tx.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'}
                        {fmt(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini balance */}
              {summary && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Saldo do mês</span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      balance >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {fmt(summary.balance)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9h12M9 3v12" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm text-zinc-400 mb-2">Nenhuma transação ainda</p>
              <Link
                href="/transactions"
                className="text-sm text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
              >
                Adicionar primeira
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/transactions', label: 'Nova transação', icon: '💸', desc: 'Registrar gasto ou receita' },
          { href: '/goals', label: 'Nova meta', icon: '🎯', desc: 'Definir limite de gasto' },
          { href: '/categories', label: 'Categorias', icon: '🏷️', desc: 'Organizar suas finanças' },
          { href: '/billing', label: 'Upgrade Premium', icon: '✦', desc: 'Desbloquear todos recursos' },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all group"
          >
            <span className="text-xl">{a.icon}</span>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mt-2 leading-tight group-hover:text-emerald-600 transition-colors">
              {a.label}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  trend,
  trendPositiveIsGood,
  variant,
  loading,
}: {
  label: string;
  value: string;
  trend: number | null;
  trendPositiveIsGood: boolean;
  variant: 'income' | 'expense' | 'balance-pos' | 'balance-neg';
  loading?: boolean;
}) {
  const textColor = {
    income: 'text-emerald-600',
    expense: 'text-red-500',
    'balance-pos': 'text-zinc-900 dark:text-zinc-50',
    'balance-neg': 'text-red-500',
  }[variant];

  const bgIcon = {
    income: 'bg-emerald-50 dark:bg-emerald-950/30',
    expense: 'bg-red-50 dark:bg-red-950/30',
    'balance-pos': 'bg-zinc-100 dark:bg-zinc-800',
    'balance-neg': 'bg-red-50 dark:bg-red-950/30',
  }[variant];

  const icon = {
    income: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 12V3M3 7.5l4.5-4.5 4.5 4.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    expense: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 3v9M3 7.5l4.5 4.5 4.5-4.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    'balance-pos': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 7.5h11M7.5 2v11" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    'balance-neg': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 12V3M3 7.5l4.5-4.5 4.5 4.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  }[variant];

  const trendIsPositive = trend !== null && trend > 0;
  const trendIsGood = trendPositiveIsGood ? trendIsPositive : !trendIsPositive;
  const trendColor = trendIsGood ? 'text-emerald-600' : 'text-red-500';
  const trendBg = trendIsGood ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30';

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgIcon}`}>
          {icon}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-6 w-28 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className={`text-xl font-bold tabular-nums tracking-tight ${textColor}`}>
            {fmt(value)}
          </p>
          {trend !== null && (
            <div className={`inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded-md text-xs font-medium ${trendColor} ${trendBg}`}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                {trendIsPositive ? (
                  <path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
              {Math.abs(trend).toFixed(1)}% vs mês anterior
            </div>
          )}
        </>
      )}
    </div>
  );
}
