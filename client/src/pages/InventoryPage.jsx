import { Globe2, Server } from 'lucide-react';
import PageContainer from '../components/PageContainer.jsx';

const TABS = [
  { id: 'domains', label: 'Domainler', icon: Globe2 },
  { id: 'servers', label: 'Sunucular', icon: Server },
];

// Domainler + Sunucular sekmeli sarmalayıcı; liste bileşenleri children olarak gelir
export default function InventoryPage({ activeTab, onTabChange, totals = {}, children }) {
  return (
    <PageContainer>
      <div
        role="tablist"
        aria-label="Envanter sekmeleri"
        className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-1.5"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = id === activeTab;
          const total = totals[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className={`flex min-w-[130px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {Number.isFinite(total) && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800/70 text-zinc-500'
                  }`}
                >
                  {total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {children}
    </PageContainer>
  );
}
