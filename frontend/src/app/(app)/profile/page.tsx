'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth.store';
import { UserResponse } from '../../../types/api';

export default function ProfilePage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.get<UserResponse>('/users/me').then((r) => r.data),
  });

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  const displayUser = profile ?? user;
  const initials = displayUser?.name
    ? displayUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const isPremium = displayUser?.plan === 'PREMIUM';

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Perfil</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Informações da sua conta
        </p>
      </div>

      {/* Avatar + name */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {displayUser?.name}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{displayUser?.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              {isPremium ? (
                <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  ✦ Premium
                </span>
              ) : (
                <span className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                  Gratuito
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 mb-4">
        <InfoRow label="Nome" value={displayUser?.name ?? '—'} />
        <InfoRow label="Email" value={displayUser?.email ?? '—'} />
        <InfoRow label="Plano" value={isPremium ? 'Premium' : 'Gratuito'} />
        {joinedDate && <InfoRow label="Membro desde" value={joinedDate} />}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path
            d="M10 7.5H2M7 4.5L10 7.5 7 10.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 3.5H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        Sair da conta
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{value}</span>
    </div>
  );
}
