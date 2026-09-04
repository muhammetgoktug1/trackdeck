import {
  Activity,
  LayoutDashboard,
  StickyNote,
  Boxes,
  Github,
  Building2,
  Plug,
  KeyRound,
  Users,
} from 'lucide-react';

const NAV_PAGES = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Genel Bakış' },
  { id: 'monitors', icon: Activity, label: 'Uptime Monitörleri' },
  { id: 'inventory', icon: Boxes, label: 'Envanter' },
  { id: 'github', icon: Github, label: 'GitHub' },
  { id: 'customers', icon: Users, label: 'Müşteriler' },
  { id: 'notes', icon: StickyNote, label: 'Notlar' },
  { id: 'credentials', icon: KeyRound, label: 'Şifreler' },
];

// Tekrar kullanılan tanımlar (bugün sağlayıcılar; not kategorileri Notlar
// sayfasının sekmelerinde yönetilir)
const NAV_DEFINITIONS = [{ id: 'providers', icon: Building2, label: 'Sağlayıcılar' }];

// Dış servis bağlantıları (kanallar sayfa içinde sekmeler halinde)
const NAV_INTEGRATIONS = [{ id: 'integrations', icon: Plug, label: 'Entegrasyonlar' }];

const NAV_SOON = [];

function NavButton({ id, icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-zinc-800/70 text-white ring-1 ring-zinc-700/60'
          : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-500" />
      )}
      <Icon
        className={`h-[18px] w-[18px] ${
          active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'
        }`}
      />
      {label}
    </button>
  );
}

export default function Sidebar({ view, onNavigate, apiOnline }) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-900/40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-950/50">
          <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[15px] font-bold leading-tight tracking-tight text-white">
            TrackDeck
          </h1>
          <p className="text-[11px] font-medium text-zinc-500">
            kişisel yönetim merkezi
          </p>
        </div>
      </div>

      {/* Navigasyon */}
      <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          Menü
        </p>

        {NAV_PAGES.map((item) => (
          <NavButton
            key={item.id}
            {...item}
            active={view === item.id}
            onClick={onNavigate}
          />
        ))}

        <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          İçerik Tanımlamaları
        </p>

        {NAV_DEFINITIONS.map((item) => (
          <NavButton
            key={item.id}
            {...item}
            active={view === item.id}
            onClick={onNavigate}
          />
        ))}

        <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          Entegrasyonlar
        </p>

        {NAV_INTEGRATIONS.map((item) => (
          <NavButton
            key={item.id}
            {...item}
            active={view === item.id}
            onClick={onNavigate}
          />
        ))}

        {NAV_SOON.length > 0 && (
          <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            Yakında
          </p>
        )}

        {NAV_SOON.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600"
            title="Bu bölüm çok yakında eklenecek"
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
            <span className="ml-auto rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
              yakında
            </span>
          </span>
        ))}
      </nav>

      {/* API durumu */}
      <div className="border-t border-zinc-800/80 p-4">
        <div className="flex items-center gap-2.5 rounded-xl bg-zinc-900/60 px-3 py-2.5 ring-1 ring-zinc-800">
          <span className="relative flex h-2.5 w-2.5">
            {apiOnline && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                  apiOnline ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
              />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                apiOnline ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
          </span>
          <span className="text-xs font-medium text-zinc-400">
            {apiOnline ? 'API çevrimiçi' : 'API bağlantısı yok'}
          </span>
        </div>
        <p className="px-1 pt-2.5 text-center text-[10px] text-zinc-700">
          v0.1 · lokal kurulum
        </p>
      </div>
    </aside>
  );
}
