import { Activity, Globe2, Server, StickyNote } from 'lucide-react';

export default function StatsCards({ stats, onNavigate }) {
  // stats: { monitors: { total, up }, domains, servers, notes }
  const s = stats;

  const cards = [
    {
      label: 'Toplam Monitör',
      value: s?.monitors.total,
      sub: s ? `${s.monitors.up} aktif` : null,
      icon: Activity,
      iconClass: 'text-indigo-400',
      bgClass: 'bg-indigo-500/10',
      ringClass: 'ring-indigo-500/20',
      view: 'monitors',
    },
    {
      label: 'Domainler',
      value: s?.domains,
      icon: Globe2,
      iconClass: 'text-cyan-400',
      bgClass: 'bg-cyan-500/10',
      ringClass: 'ring-cyan-500/20',
      view: 'inventory',
      tab: 'domains',
    },
    {
      label: 'Sunucular',
      value: s?.servers,
      icon: Server,
      iconClass: 'text-violet-400',
      bgClass: 'bg-violet-500/10',
      ringClass: 'ring-violet-500/20',
      view: 'inventory',
      tab: 'servers',
    },
    {
      label: 'Notlar',
      value: s?.notes,
      icon: StickyNote,
      iconClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      ringClass: 'ring-amber-500/20',
      view: 'notes',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(
        ({ label, value, sub, icon: Icon, iconClass, bgClass, ringClass, view, tab }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(view, tab)}
            className="group flex items-center gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${bgClass} ${ringClass}`}
            >
              <Icon className={`h-5 w-5 ${iconClass}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold leading-none tracking-tight text-white">
                  {value ?? '—'}
                </p>
                {sub && (
                  <p className="flex items-center gap-1 text-xs font-medium text-zinc-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {sub}
                  </p>
                )}
              </div>
              <p className="mt-1.5 truncate text-[13px] font-medium text-zinc-500 group-hover:text-zinc-400">
                {label}
              </p>
            </div>
          </button>
        )
      )}
    </div>
  );
}
