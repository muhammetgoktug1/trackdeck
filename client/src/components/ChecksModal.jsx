import { useEffect } from 'react';
import { X, RefreshCw, ChevronLeft, ChevronRight, History } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import {
  formatDateTimeTR,
  formatResponseTime,
  responseTimeClass,
} from '../lib/format.js';

function SummaryItem({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-zinc-800/40 px-2 py-2.5 ring-1 ring-zinc-800">
      <span className={`text-[15px] font-bold leading-none ${valueClass}`}>{value}</span>
      <span className="mt-1 text-[11px] font-medium text-zinc-500">{label}</span>
    </div>
  );
}

export default function ChecksModal({ state, onClose, onPageChange, onRefresh }) {
  const { open, monitor, data, total, page, totalPages, summary, loading } = state;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 animate-pop-in">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <History className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-bold text-white">
                Kontrol Geçmişi
              </h2>
              <p className="truncate text-xs text-zinc-500">{monitor?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              title="Yenile"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Özet istatistikler */}
        <div className="grid grid-cols-5 gap-2 px-6 pt-5">
          <SummaryItem label="Kontrol" value={summary ? summary.totalChecks : '—'} />
          <SummaryItem
            label="Uptime"
            value={summary ? `%${String(summary.uptimePercent).replace('.', ',')}` : '—'}
            valueClass={
              !summary ? 'text-white' : summary.uptimePercent >= 99
                ? 'text-emerald-400'
                : summary.uptimePercent >= 90
                  ? 'text-amber-400'
                  : 'text-rose-400'
            }
          />
          <SummaryItem
            label="Ort. Yanıt"
            value={summary?.avgResponseTime != null ? formatResponseTime(summary.avgResponseTime) : '—'}
            valueClass="text-white"
          />
          <SummaryItem
            label="En Hızlı"
            value={summary?.minResponseTime != null ? formatResponseTime(summary.minResponseTime) : '—'}
            valueClass="text-emerald-400"
          />
          <SummaryItem
            label="En Yavaş"
            value={summary?.maxResponseTime != null ? formatResponseTime(summary.maxResponseTime) : '—'}
            valueClass="text-rose-400"
          />
        </div>

        {/* Geçmiş tablosu */}
        <div className="min-h-[180px] flex-1 overflow-y-auto px-6 pb-2 pt-4">
          {loading && data.length === 0 ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-xl bg-zinc-800/40"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <History className="h-8 w-8 text-zinc-700" />
              <p className="mt-3 text-sm font-medium text-zinc-400">
                Henüz kontrol geçmişi yok
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                "Şimdi kontrol et" ile ölçüm yapınca burada listelenir
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                  <th className="py-2 pr-3">Zaman</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Yanıt</th>
                  <th className="px-3 py-2">Kod</th>
                  <th className="py-2 pl-3">Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {data.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-zinc-800/30">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-400">
                      {formatDateTimeTR(c.checkedAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td
                      className={`px-3 py-2.5 font-mono text-[13px] font-medium ${responseTimeClass(
                        c.responseTime
                      )}`}
                    >
                      {formatResponseTime(c.responseTime)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[13px] text-zinc-400">
                      {c.statusCode ?? '—'}
                    </td>
                    <td className="max-w-[180px] truncate py-2.5 pl-3 text-xs text-zinc-600">
                      {c.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Alt bilgi + sayfalama */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-3.5">
          <span className="text-xs text-zinc-600">
            {total > 0 ? `Toplam ${total} kontrol kaydı` : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              title="Önceki sayfa"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-14 text-center text-xs font-semibold text-zinc-400">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              title="Sonraki sayfa"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
