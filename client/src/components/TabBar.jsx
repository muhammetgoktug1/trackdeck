// Ortak sekme çubuğu — IntegrationPage/Envanter/Notlar sayfalarının deseni.
// Aktif sekme indigo vurgulu; totals verilirse sekmelere sayı rozeti eklenir.
export default function TabBar({ tabs, active, onChange, totals = {}, ariaLabel = 'Sekmeler' }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-1.5"
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = id === active;
        const total = totals[id];
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={`flex min-w-[110px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
            {Number.isFinite(total) && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800/70 text-zinc-500'
                }`}
              >
                {total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
