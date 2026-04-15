'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../../lib/api';
import { CategoryResponse, CreateCategoryDto } from '../../../types/api';

const categorySchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  icon: z.string().optional(),
  color: z.string().optional(),
});
type CategoryForm = z.infer<typeof categorySchema>;

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#a855f7',
];

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryResponse[]>('/categories').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateCategoryDto) =>
      api.post('/categories', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryDto> }) =>
      api.patch(`/categories/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setDeletingId(null);
    },
  });

  const form = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) });

  function openCreate() {
    form.reset({ name: '', icon: '', color: PRESET_COLORS[0] });
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(cat: CategoryResponse) {
    form.reset({
      name: cat.name,
      icon: cat.icon ?? '',
      color: cat.color ?? PRESET_COLORS[0],
    });
    setEditing(cat);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function onSubmit(values: CategoryForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: values });
    } else {
      createMutation.mutate(values as CreateCategoryDto);
    }
  }

  const systemCategories = categories?.filter((c) => c.isSystem) ?? [];
  const userCategories = categories?.filter((c) => !c.isSystem) ?? [];
  const isPending = createMutation.isPending || updateMutation.isPending;
  const watchedColor = form.watch('color');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Categorias</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Organize suas transações com categorias personalizadas
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3.5 py-2 rounded-xl transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Nova categoria
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* User categories */}
          {userCategories.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                Suas categorias
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {userCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    cat={cat}
                    onEdit={() => openEdit(cat)}
                    onDelete={() => setDeletingId(cat.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* System categories */}
          {systemCategories.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                Categorias padrão
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {systemCategories.map((cat) => (
                  <CategoryCard key={cat.id} cat={cat} readOnly />
                ))}
              </div>
            </section>
          )}

          {categories?.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-zinc-400">Nenhuma categoria encontrada</p>
            </div>
          )}
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
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-5">
              {editing ? 'Editar categoria' : 'Nova categoria'}
            </h2>

            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: `${watchedColor ?? '#10b981'}22` }}
                >
                  {form.watch('icon') || '📂'}
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {form.watch('name') || 'Nome da categoria'}
                </span>
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome
                </label>
                <input
                  {...form.register('name')}
                  type="text"
                  placeholder="Ex: Alimentação, Lazer..."
                  className={inputCls}
                />
                {form.formState.errors.name && (
                  <span className="text-xs text-red-500">
                    {form.formState.errors.name.message}
                  </span>
                )}
              </div>

              {/* Icon */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ícone{' '}
                  <span className="text-zinc-400 font-normal">(emoji, opcional)</span>
                </label>
                <input
                  {...form.register('icon')}
                  type="text"
                  placeholder="🍔"
                  maxLength={4}
                  className={inputCls}
                />
              </div>

              {/* Color */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Cor
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => form.setValue('color', c)}
                      className={`w-7 h-7 rounded-lg transition-all ${
                        watchedColor === c
                          ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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
              Excluir categoria?
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Transações associadas não serão excluídas.
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

function CategoryCard({
  cat,
  readOnly,
  onEdit,
  onDelete,
}: {
  cat: CategoryResponse;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{
            backgroundColor: cat.color ? `${cat.color}22` : '#f4f4f5',
          }}
        >
          {cat.icon ?? '📂'}
        </div>
        {readOnly ? (
          <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            Sistema
          </span>
        ) : (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
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
              onClick={onDelete}
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
        )}
      </div>
      <div className="flex items-center gap-2">
        {cat.color && (
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: cat.color }}
          />
        )}
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
          {cat.name}
        </p>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition';
