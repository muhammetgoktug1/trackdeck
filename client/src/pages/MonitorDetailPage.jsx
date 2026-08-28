import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';
import Sparkline from '../components/Sparkline.jsx';
import UptimeRibbon from '../components/UptimeRibbon.jsx';
import Pagination from '../components/Pagination.jsx';
import PageContainer from '../components/PageContainer.jsx';
import { api } from '../lib/api.js';
import {
  formatInterval,
  formatResponseTime,
  formatDateTimeTR,
  responseTimeClass,
  timeAgo,
} from '../lib/format.js';

const RANGES = [
  { id: '24h', label: '24 Saat', hours: 24 },
  { id: '7d', label: '7 Gün', hours: 168 },
  { id: '30d', label: '30 Gün', hours: 720 },
];

function SummaryItem({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-zinc-800/40 px-2 py-2.5 ring-1 ring-zinc-800">
      <span className={`text-[15px] font-bold leading-none ${valueClass}`}>{value}</span>
      <span className="mt-1 text-[11px] font-medium text-zinc-500">{label}</span>
    </div>
  );
}

export default function MonitorDetailPage({ monitor, onBack, onEdit, onDelete }) {
  const [current, setCurrent] = useState(monitor);
  const [rangeId, setRangeId] = useState('24h');
  const [series, setSeries] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [incidents, setIncidents] = useState(null);
  const [checking, setChecking] = useState(false);
  const [history, setHistory] = useState({
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    summary: null,
    loading: true,
  });

  const range = RANGES.find((r) => r.id === rangeId);

  const loadMonitor = useCallback(async () => {
    try {
      setCurrent(await api.getMonitor(monitor.id));
    } catch {
      // monitör silinmiş olabilir; liste görününe dönmeyi App yönetir
    }
  }, [monitor.id]);

  const loadSeries = useCallback(async () => {
    setSeriesLoading(true);
    try {
      setSeries(await api.monitorTimeseries(monitor.id, range.hours));
    } catch {
      setSeries(null);
    } finally {
      setSeriesLoading(false);
    }
  }, [monitor.id, range.hours]);

  const loadIncidents = useCallback(async () => {
    try {
      setIncidents(await api.monitorIncidents(monitor.id, 30));
    } catch {
      setIncidents(null);
    }
  }, [monitor.id]);

  const loadHistory = useCallback(
    async (page = 1) => {
      setHistory((h) => ({ ...h, loading: true }));
      try {
        const res = await api.monitorChecks(monitor.id, page, 10);
        setHistory({ ...res, loading: false });
      } catch {
        setHistory((h) => ({ ...h, loading: false }));
      }
    },
    [monitor.id]
  );

  useEffect(() => {
    loadMonitor();
    loadIncidents();
    loadHistory(1);
  }, [loadMonitor, loadIncidents, loadHistory]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  // hero kartı canlı kalsın (uzaktan düzenleme/durum değişimi)
  useEffect(() => {
    const timer = setInterval(loadMonitor, 15_000);
    return () => clearInterval(timer);
  }, [loadMonitor]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      setCurrent(await api.checkMonitor(monitor.id));
      loadHistory(history.page);
      loadSeries();
      loadIncidents();
    } catch {
      // hata toast'ı App katmanında yok; sessiz geç
    } finally {
      setChecking(false);
    }
  };

  // Grafik penceresi özeti kovalardan toplanır
  const windowStats = series
    ? series.buckets.reduce(
        (acc, b) => ({ up: acc.up + b.up, total: acc.total + b.total }),
        { up: 0, total: 0 }
      )
    : null;
  const windowUptime =
    windowStats && windowStats.total > 0
      ? Math.round((windowStats.up / windowStats.total) * 1000) / 10
      : null;

  const s = history.summary;

  return (
    <PageContainer>
      {/* Hero kartı */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800/80 px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                title="Monitörlere dön"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="min-w-0 break-words text-base font-bold text-white">
                {current.name}
              </h2>
              <StatusBadge status={current.status} />
            </div>
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 ml-12 inline-flex max-w-full items-center gap-1.5 truncate text-[13px] text-zinc-500 transition-colors hover:text-indigo-400"
            >
              <span className="truncate">{current.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCheck}
              disabled={checking}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3.5 py-2 text-[13px] font-semibold text-zinc-300 transition-colors hover:bg-zinc-800/60 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
              Şimdi Kontrol Et
            </button>
            <button
              type="button"
              title="Düzenle"
              onClick={() => onEdit(current)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Sil"
              onClick={() => onDelete(current)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-[13px] text-zinc-400">
          <span>
            Yöntem: <span className="font-semibold text-zinc-200">{current.method}</span>
          </span>
          <span>
            Aralık: <span className="font-semibold text-zinc-200">{formatInterval(current.interval)}</span>
          </span>
          <span>
            Son yanıt:{' '}
            <span className={`font-mono font-semibold ${responseTimeClass(current.lastResponseTime)}`}>
              {formatResponseTime(current.lastResponseTime)}
            </span>
          </span>
          <span>
            Son kontrol:{' '}
            <span className="font-semibold text-zinc-200">{timeAgo(current.lastCheckedAt)}</span>
          </span>
          {current.domain && (
            <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-400 ring-1 ring-cyan-500/20">
              {current.domain.name}
            </span>
          )}
          {current.server && (
            <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-400 ring-1 ring-violet-500/20">
              {current.server.name}
            </span>
          )}
        </div>
        {current.notes && (
          <p className="border-t border-zinc-800/70 px-6 py-3 text-[13px] leading-relaxed text-zinc-500">
            {current.notes}
          </p>
        )}
      </div>

      {/* Zaman aralığı + grafikler */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-5 py-4">
          <h3 className="text-sm font-semibold text-white">Grafikler</h3>
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRangeId(r.id)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ring-1 transition-colors ${
                  r.id === rangeId
                    ? 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/40'
                    : 'bg-zinc-800/50 text-zinc-500 ring-zinc-700/60 hover:text-zinc-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          {seriesLoading ? (
            <div className="flex h-[120px] items-center justify-center gap-2 text-xs text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Grafik verisi yükleniyor...
            </div>
          ) : series && series.buckets.length > 0 ? (
            <>
              <Sparkline buckets={series.buckets} height={160} />
              {range.hours <= 168 && (
                <UptimeRibbon buckets={series.buckets} label={`Son ${range.label}`} />
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryItem
                  label="Pencere Uptime"
                  value={windowUptime === null ? '—' : `%${String(windowUptime).replace('.', ',')}`}
                  valueClass={
                    windowUptime === null
                      ? 'text-white'
                      : windowUptime >= 99
                        ? 'text-emerald-400'
                        : windowUptime >= 90
                          ? 'text-amber-400'
                          : 'text-rose-400'
                  }
                />
                <SummaryItem
                  label="Ort. Yanıt"
                  value={s?.avgResponseTime != null ? formatResponseTime(s.avgResponseTime) : '—'}
                />
                <SummaryItem
                  label="En Hızlı"
                  value={s?.minResponseTime != null ? formatResponseTime(s.minResponseTime) : '—'}
                  valueClass="text-emerald-400"
                />
                <SummaryItem
                  label="En Yavaş"
                  value={s?.maxResponseTime != null ? formatResponseTime(s.maxResponseTime) : '—'}
                  valueClass="text-rose-400"
                />
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-xs text-zinc-600">
              Bu aralıkta ölçüm yok
            </p>
          )}
        </div>
      </div>

      {/* Kesintiler */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-sm font-semibold text-white">Kesintiler</h3>
          {incidents?.summary && (
            <span className="text-xs text-zinc-500">
              son {incidents.days} günde{' '}
              <span className="font-semibold text-zinc-300">{incidents.summary.count}</span> kesinti
              {incidents.summary.totalDownMs > 0 && (
                <>
                  {' '}· toplam{' '}
                  <span className="font-semibold text-zinc-300">
                    {formatInterval(Math.round(incidents.summary.totalDownMs / 1000))}
                  </span>
                </>
              )}
            </span>
          )}
        </div>
        {incidents === null ? (
          <div className="px-5 pb-5 text-xs text-zinc-600">Kesinti verisi yüklenemedi</div>
        ) : incidents.incidents.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-zinc-500">
            Son {incidents.days} günde kesinti yok 🎉
          </p>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {incidents.incidents.slice(0, 10).map((i) => (
              <div key={i.startedAt} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    i.ongoing ? 'bg-rose-500' : 'bg-zinc-600'
                  }`}
                />
                <span className="text-[13px] text-zinc-300">
                  {formatDateTimeTR(i.startedAt)}
                  <span className="mx-1.5 text-zinc-600">→</span>
                  {i.endedAt ? formatDateTimeTR(i.endedAt) : 'hâlâ devam ediyor'}
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {formatInterval(Math.round(i.durationMs / 1000))}
                  {i.ongoing && (
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 ring-1 ring-rose-500/20">
                      devam ediyor
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kontrol geçmişi */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <h3 className="text-sm font-semibold text-white">Kontrol Geçmişi</h3>
          {history.total > 0 && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-400">
              {history.total}
            </span>
          )}
        </div>
        {history.loading && history.data.length === 0 ? (
          <div className="flex flex-col gap-2 px-5 pb-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-xl bg-zinc-800/40"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : history.data.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-zinc-500">Henüz kontrol kaydı yok</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-t border-zinc-800/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                    <th className="px-5 py-3">Zaman</th>
                    <th className="px-3 py-3">Durum</th>
                    <th className="px-3 py-3">Yanıt</th>
                    <th className="px-3 py-3">Kod</th>
                    <th className="px-5 py-3">Not</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {history.data.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-zinc-800/30">
                      <td className="whitespace-nowrap px-5 py-2.5 text-zinc-400">
                        {formatDateTimeTR(c.checkedAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={c.status} />
                      </td>
                      <td
                        className={`px-3 py-2.5 font-mono text-[13px] font-medium ${responseTimeClass(c.responseTime)}`}
                      >
                        {formatResponseTime(c.responseTime)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[13px] text-zinc-400">
                        {c.statusCode ?? '—'}
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-2.5 text-xs text-zinc-600">
                        {c.reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={history.page}
              limit={history.limit}
              total={history.total}
              onPageChange={(page) => loadHistory(page)}
              onLimitChange={(limit) => loadHistory(1)}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
