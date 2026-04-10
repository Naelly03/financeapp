export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(161 161 170 / 0.15) 1px, transparent 0)',
        backgroundSize: '24px 24px',
      }}
    >
      <header className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 10L6 6L9 9L14 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 4H14V7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            FinanceApp
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm py-12">
          {children}
        </div>
      </div>
    </div>
  );
}
