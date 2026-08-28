import {
  ChevronRight,
  Globe2,
  Plus,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import StatsCards from '../components/StatsCards.jsx';
import PageContainer from '../components/PageContainer.jsx';
import { formatInterval, timeAgo } from '../lib/format.js';

const fmtPct = (v) => (v === null || v === undefined ? '—' : `%${String(v).replace('.', ',')}`);

const fmtDuration = (minutes) => {
  if (minutes < 60) return `${minutes} dk`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
  return `${Math.floor(minutes / 1440)} gün ${Math.floor((minutes % 1440) / 60)} sa`;
};

// Sistem sağlığının tek bakışta özeti: renk + tek cümle
function StatusBanner({ stats, onNavigate }) {
  if (!stats) {
    return <div className="h-[92px] animate-pulse rounded-2xl bg-zinc-900/50" />;
  }

  const { monitors, downMonitors, uptime7dAvg, checks7d } = stats;

  if (monitors.total === 0) {
    return (
      <button
        type="button"
        onClick={() => onNavigate('monitors')}
        className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-6 py-5 text-left transition-colors hover:border-zinc-700"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
            <Plus className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white">Henüz izlenen site yok</p>
            <p className="mt-0.5 text-[13px] text-zinc-500">
              İlk monitörünü ekleyerek takibe başla — gerisini panel halleder
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  const isDown = downMonitors.length > 0;
  const longestDown = isDown ? Math.max(...downMonitors.map((m) => m.downMinutes)) : 0;

  return (
    <button
      type="button"
      onClick={() => onNavigate('monitors')}
      className={`group flex w-full items-center gap-4 rounded-2xl px-6 py-5 text-left ring-1 transition-colors ${
        isDown
          ? 'bg-rose-500/10 ring-rose-500/25 hover:bg-rose-500/15'
          : 'bg-emerald-500/10 ring-emerald-500/25 hover:bg-emerald-500/15'
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
          isDown
            ? 'bg-rose-500/15 ring-rose-500/30'
            : 'bg-emerald-500/15 ring-emerald-500/30'
        }`}
      >
        {isDown ? (
          <ShieldAlert className="h-5 w-5 text-rose-400" />
        ) : (
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-[15px] font-bold ${isDown ? 'text-rose-300' : 'text-emerald-300'}`}>
          {isDown
            ? `${downMonitors.length} MONİTÖR ERİŞİLEMEZİYOR`
            : 'TÜM SİSTEMLER ÇALIŞIYOR'}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-zinc-400">
          {isDown ? (
            <>
              en uzun {fmtDuration(longestDown)}'dır · {monitors.up}/{monitors.total} monitör
              ayakta{monitors.paused > 0 && ` · ${monitors.paused} duraklatıldı`}
            </>
          ) : (
            <>
              {monitors.total} monitör izleniyor · son 7 gün {fmtPct(uptime7dAvg)} uptime
              {checks7d.total > 0 && ` · ${checks7d.total} kontrol`}
              {monitors.paused > 0 && ` · ${monitors.paused} duraklatıldı`}
            </>
          )}
        </p>
      </div>
      <ChevronRight
        className={`ml-auto h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
          isDown ? 'text-rose-400/60' : 'text-emerald-400/60'
        }`}
      />
    </button>
  );
}

function IssuesCard({ stats, onNavigate }) {
  const downs = stats?.downMonitors ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-white">
          Aktif Sorunlar
          {stats && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                downs.length > 0
                  ? 'bg-rose-500/15 text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {downs.length}
            </span>
          )}
        </h2>
      </div>

      {!stats ? (
        <div className="flex flex-col gap-2 px-5 pb-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-800/40" />
          ))}
        </div>
      ) : downs.length === 0 ? (
        <div className="flex flex-col items-center px-6 pb-8 pt-6 text-center">
          <ShieldCheck className="h-8 w-8 text-emerald-500/70" />
          <p className="mt-3 text-sm font-semibold text-zinc-200">Aktif sorun yok 🎉</p>
          <p className="mt-1 text-xs text-zinc-500">
            {stats.checks7d.total > 0
              ? `son 7 günde ${stats.checks7d.total} kontrol yapıldı`
              : 'henüz yeterli kontrol geçmişi birikmedi'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {downs.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onNavigate('monitor-detail', null, m)}
              className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-zinc-800/30"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-100">{m.name}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {fmtDuration(m.downMinutes)}'dır düşük
                  {m.lastStatusCode ? ` · HTTP ${m.lastStatusCode}` : ' · bağlantı kurulamadı'}
                  {` · son kontrol ${timeAgo(m.lastCheckedAt)}`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AttentionCard({ stats, onNavigate }) {
  const expiring = stats?.domainsExpiring ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Dikkat Gerektiren</h2>
      </div>

      {!stats ? (
        <div className="flex flex-col gap-2 px-5 pb-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-zinc-800/40" />
          ))}
        </div>
      ) : expiring.length === 0 ? (
        <div className="flex flex-col items-center px-6 pb-8 pt-6 text-center">
          <Globe2 className="h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm font-semibold text-zinc-200">Yaklaşan domain bitişi yok</p>
          <p className="mt-1 text-xs text-zinc-500">30 gün içinde biten domain bulunmuyor 🎉</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {expiring.map((d) => {
            const expired = d.days < 0;
            const soon = d.days < 15;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onNavigate('inventory', 'domains')}
                className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-zinc-800/30"
              >
                <Globe2 className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
                  {d.name}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                    expired
                      ? 'bg-rose-500/10 text-rose-400 ring-rose-500/20'
                      : soon
                        ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20'
                  }`}
                >
                  {expired ? 'süresi geçti' : `${d.days} gün`}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onNavigate('inventory', 'domains')}
            className="flex w-full items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-300"
          >
            tüm domainler
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage({ stats, onNavigate }) {
  return (
    <PageContainer>
      <StatusBanner stats={stats} onNavigate={onNavigate} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <IssuesCard stats={stats} onNavigate={onNavigate} />
          <StatsCards stats={stats} onNavigate={onNavigate} />
        </div>
        <AttentionCard stats={stats} onNavigate={onNavigate} />
      </div>

      <p className="text-center text-xs text-zinc-700">
        Veriler 15 saniyede bir otomatik yenilenir · kart ve satırlara tıklayarak
        ilgili bölüme geçebilirsin
      </p>
    </PageContainer>
  );
}
