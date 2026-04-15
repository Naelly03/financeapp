'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/auth.store';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1.25" stroke="currentColor" strokeWidth="1.4" />
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.25" stroke="currentColor" strokeWidth="1.4" />
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.25" stroke="currentColor" strokeWidth="1.4" />
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.25" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    href: '/transactions',
    label: 'Transações',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 4h11M2 7.5h7M2 11h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/categories',
    label: 'Categorias',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path
          d="M2 4a2 2 0 0 1 2-2h3.172a1 1 0 0 1 .707.293l4.121 4.121a1 1 0 0 1 0 1.414l-3.293 3.293a1 1 0 0 1-1.414 0L2.293 6.707A1 1 0 0 1 2 6V4Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/goals',
    label: 'Metas',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/billing',
    label: 'Plano',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1.5 6.5h12" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 10L6 6L9 9L14 4"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 4H14V7"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              FinanceApp
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User at bottom */}
        <div className="px-2 py-3 border-t border-zinc-200 dark:border-zinc-800">
          <Link
            href="/profile"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              pathname === '/profile'
                ? 'bg-emerald-50 dark:bg-emerald-950/40'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate leading-tight">
                {user?.name}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {user?.plan === 'PREMIUM' ? '✦ Premium' : 'Gratuito'}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
