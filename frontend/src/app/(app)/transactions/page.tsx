'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import {
  TransactionResponse,
  CategoryResponse,
  PaginatedResult,
  CreateTransactionDto,
  SummaryResult,
} from '../../../types/api';

function fmt(value: string | number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    typeof value === 'string' ? parseFloat(value) : value,
  );
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const txSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Informe um valor' })
    .positive('O valor deve ser positivo'),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.string().min(1, 'Informe a data'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  description: z.string().optional(),
});
type TxForm = z.infer<typeof txSchema>;

export default function TransactionsPage() {
  const qc = useQueryClient();
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', month, year, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
        limit: '100',
        page: '1',
        ...(typeFilter !== 'ALL' ? { type: typeFilter } : {}),
      });
      return api
        .get<PaginatedResult<TransactionResponse>>(`/transactions?${params}`)
        .then((r) => r.data);
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['summary', month, year],
    queryFn: () =>
      api.get<SummaryResult>(`/summary?month=${month}&year=${year}`).then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryResponse[]>('/categories').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateTransactionDto) =>
      api.post('/transactions', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['summary-chart'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransactionDto> }) =>
      api.patch(`/transactions/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['summary-chart'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['summary-chart'] });
      setDeletingId(null);
    },
  });

  const form = useForm<TxForm>({ resolver: zodResolver(txSchema) });

  function openCreate() {
    form.reset({
      type: 'EXPENSE',
      date: new Date().toISOString().slice(0, 10),
      description: '',
      categoryId: '',
      amount: undefined,
    });
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(tx: TransactionResponse) {
    form.reset({
      amount: parseFloat(tx.amount),
      type: tx.type,
      date: tx.date.slice(0, 10),
      categoryId: tx.categoryId,
      description: tx.description ?? '',
    });
    setEditing(tx);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function onSubmit(values: TxForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: values });
    } else {
      createMutation.mutate(values as CreateTransactionDto);
    }
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const watchedType = form.watch('type');

  // Group by date descending
  const grouped = (data?.data ?? []).reduce<Record<string, TransactionResponse[]>>((acc, tx) => {
    const key = tx.date.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const balance = summary ? parseFloat(summary.balance) : 0;
  const incomeCount = data?.data?.filter((t) => t.type === 'INCOME').length ?? 0;
  const expenseCount = data?.data?.filter((t) => t.type === 'EXPENSE').length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Transações</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3.5 py-2 rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nova transação
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Month navigation */}
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-1 py-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M8 10L4.5 6.5 8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 px-2 min-w-[130px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 10l3.5-3.5L5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
          {(['ALL', 'INCOME', 'EXPENSE'] as const).map((t) => {
            const count = t === 'INCOME' ? incomeCount : t === 'EXPENSE' ? expenseCount : (incomeCount + expenseCount);
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {t === 'ALL' ? 'Todos' : t === 'INCOME' ? 'Receitas' : 'Despesas'}
                {!isLoading && (
                  <span className={`text-[10px] tabular-nums ${typeFilter === t ? 'opacity-70' : 'opacity-50'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Monthly summary strip */}
      {summary && !isLoading && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-3 border border-emerald-100 dark:border-emerald-900/50">
            <p className="text-[11px] text-emerald-600 dark:text-emerald-500 font-medium uppercase tracking-wide">Receitas</p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
              {fmt(summary.income)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3 border border-red-100 dark:border-red-900/50">
            <p className="text-[11px] text-red-500 dark:text-red-400 font-medium uppercase tracking-wide">Despesas</p>
            <p className="text-base font-bold text-red-600 dark:text-red-400 tabular-nums mt-0.5">
              {fmt(summary.expenses)}
            </p>
          </div>
          <div className={`rounded-xl px-4 py-3 border ${
            balance >= 0
              ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
              : 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50'
          }`}>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Saldo</p>
            <p className={`text-base font-bold tabular-nums mt-0.5 ${balance >= 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-red-500'}`}>
              {fmt(summary.balance)}
            </p>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {isLoading ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="h-4 w-20 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 6h14M3 10h8M3 14h5" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-500">Nenhuma transação em {MONTHS[month - 1]}</p>
          <button
            onClick={openCreate}
            className="mt-3 text-sm text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
          >
            Adicionar primeira transação
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const txs = grouped[date];
            const dayIncome = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + parseFloat(t.amount), 0);
            const dayExpense = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + parseFloat(t.amount), 0);

            return (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 capitalize">
                    {fmtDate(date)}
                  </span>
                  <div className="flex items-center gap-3">
                    {dayIncome > 0 && (
                      <span className="text-xs font-medium text-emerald-600 tabular-nums">+{fmt(dayIncome)}</span>
                    )}
                    {dayExpense > 0 && (
                      <span className="text-xs font-medium text-red-500 tabular-nums">-{fmt(dayExpense)}</span>
                    )}
                  </div>
                </div>

                {/* Transactions for this date */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {txs.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                          style={{
                            backgroundColor: tx.category.color ? `${tx.category.color}22` : '#f4f4f5',
                          }}
                        >
                          {tx.category.icon ?? '💰'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                            {tx.description || tx.category.name}
                          </p>
                          {tx.description && (
                            <p className="text-[11px] text-zinc-400 truncate">{tx.category.name}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              tx.type === 'INCOME' ? 'text-emerald-600' : 'text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {tx.type === 'INCOME' ? '+' : '-'}
                            {fmt(tx.amount)}
                          </span>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(tx)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <path d="M9 1.5L11.5 4 4.5 11H2v-2.5L9 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeletingId(tx.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <path d="M2 3.5h9M5 3.5V2h3v1.5M5.5 6v3.5M7.5 6v3.5M3 3.5l.5 7h6l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && data.meta.total > 0 && (
        <p className="text-xs text-zinc-400 text-center mt-4">
          {data.meta.total} transaç{data.meta.total === 1 ? 'ão' : 'ões'} · {MONTHS[month - 1]} {year}
        </p>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {editing ? 'Editar transação' : 'Nova transação'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Type */}
              <div className="flex gap-2">
                {(['EXPENSE', 'INCOME'] as const).map((t) => (
                  <label
                    key={t}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                      watchedType === t
                        ? t === 'INCOME'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                          : 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    <input {...form.register('type')} type="radio" value={t} className="sr-only" />
                    <span>{t === 'INCOME' ? '↑' : '↓'}</span>
                    {t === 'INCOME' ? 'Receita' : 'Despesa'}
                  </label>
                ))}
              </div>

              {/* Amount */}
              <Field label="Valor (R$)" error={form.formState.errors.amount?.message}>
                <input
                  {...form.register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className={inputCls}
                />
              </Field>

              {/* Category */}
              <Field label="Categoria" error={form.formState.errors.categoryId?.message}>
                <select {...form.register('categoryId')} className={inputCls}>
                  <option value="">Selecione...</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <Field label="Data" error={form.formState.errors.date?.message}>
                  <input {...form.register('date')} type="date" className={inputCls} />
                </Field>

                {/* Description */}
                <Field label="Descrição (opcional)">
                  <input
                    {...form.register('description')}
                    type="text"
                    placeholder="Ex: almoço..."
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {isPending ? 'Salvando...' : editing ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-sm p-6">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center mb-4">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 5h12M7 5V3.5h4V5M7.5 8.5v4M10.5 8.5v4M4 5l.75 10h8.5L14 5" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Excluir transação?
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition';

function Field({
  label,
  error,
  children,
}: {
  label: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
