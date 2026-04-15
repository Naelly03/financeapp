'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { GoalResponse, CategoryResponse, CreateGoalDto } from '../../../types/api';

function fmt(value: string | number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    typeof value === 'string' ? parseFloat(value) : value,
  );
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const goalSchema = z.object({
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  amount: z
    .number({ invalid_type_error: 'Informe um valor' })
    .positive('O valor deve ser positivo'),
});
type GoalForm = z.infer<typeof goalSchema>;

export default function GoalsPage() {
  const qc = useQueryClient();
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GoalResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals', month, year],
    queryFn: () =>
      api
        .get<GoalResponse[]>(`/goals?month=${month}&year=${year}`)
        .then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryResponse[]>('/categories').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateGoalDto) => api.post('/goals', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.patch(`/goals/${id}`, { amount }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setDeletingId(null);
    },
  });

  const form = useForm<GoalForm>({ resolver: zodResolver(goalSchema) });

  function openCreate() {
    form.reset({ categoryId: '', amount: undefined });
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(goal: GoalResponse) {
    form.reset({ categoryId: goal.categoryId, amount: parseFloat(goal.amount) });
    setEditing(goal);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function onSubmit(values: GoalForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, amount: values.amount });
    } else {
      createMutation.mutate({
        categoryId: values.categoryId,
        amount: values.amount,
        month,
        year,
      });
    }
  }

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Categories that don't already have a goal this month (for the create form)
  const usedCategoryIds = new Set(goals?.map((g) => g.categoryId) ?? []);
  const availableCategories = categories?.filter((c) => !usedCategoryIds.has(c.id)) ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Metas</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Defina limites de gastos por categoria
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3.5 py-2 rounded-xl transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nova meta
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-1 py-1 mb-5 w-fit">
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

      {/* Goals grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !goals?.length ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-400">Nenhuma meta para este mês</p>
          <button
            onClick={openCreate}
            className="mt-2 text-sm text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
          >
            Criar primeira meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const amount = parseFloat(goal.amount);
            const spent = parseFloat(goal.spent);
            const pct = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
            const isOver = spent > amount;

            return (
              <div
                key={goal.id}
                className="group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{
                        backgroundColor: goal.category.color
                          ? `${goal.category.color}22`
                          : '#f4f4f5',
                      }}
                    >
                      {goal.category.icon ?? '🎯'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {goal.category.name}
                      </p>
                      <p className="text-[11px] text-zinc-400">Meta mensal</p>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(goal)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M8.5 1L11 3.5 4.5 10H2V7.5L8.5 1Z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingId(goal.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 3h8M4.5 3V2h3v1M5 5v3M7 5v3M2.5 3l.5 7h6l.5-7"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-500">
                      {fmt(spent)} <span className="text-zinc-300 dark:text-zinc-600">/ {fmt(amount)}</span>
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isOver ? 'text-red-500' : pct >= 80 ? 'text-amber-500' : 'text-emerald-600'
                      }`}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver
                          ? 'bg-red-500'
                          : pct >= 80
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {isOver && (
                    <p className="text-[11px] text-red-500 mt-1.5">
                      Limite excedido em {fmt(spent - amount)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              {editing ? 'Editar meta' : 'Nova meta'}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
              {MONTHS[month - 1]} {year}
            </p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Category (only for create) */}
              {!editing && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Categoria
                  </label>
                  <select {...form.register('categoryId')} className={inputCls}>
                    <option value="">Selecione...</option>
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon ? `${c.icon} ` : ''}
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.categoryId && (
                    <span className="text-xs text-red-500">
                      {form.formState.errors.categoryId.message}
                    </span>
                  )}
                </div>
              )}

              {editing && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{
                      backgroundColor: editing.category.color
                        ? `${editing.category.color}22`
                        : '#f4f4f5',
                    }}
                  >
                    {editing.category.icon ?? '🎯'}
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {editing.category.name}
                  </span>
                </div>
              )}

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Limite mensal (R$)
                </label>
                <input
                  {...form.register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className={inputCls}
                />
                {form.formState.errors.amount && (
                  <span className="text-xs text-red-500">
                    {form.formState.errors.amount.message}
                  </span>
                )}
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
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {isPending ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeletingId(null)}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Excluir meta?
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
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
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
