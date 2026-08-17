import {
  ExternalLink,
  Pencil,
  RefreshCw,
  Trash2,
  Globe,
  History,
} from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import Pagination from './Pagination.jsx';
import {
  formatInterval,
  formatResponseTime,
  responseTimeClass,
  timeAgo,
} from '../lib/format.js';

function IconButton({ title, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 ${className}`}
    >
      {children}
    </button>
  );
}

export default function MonitorTable({
  monitors,
  loading,
  checkingIds,
  onCheck,
  onEdit,
  onDelete,
  onHistory,
  onAdd,
  pagination = null,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-white">Monitörler</h2>
          {!loading && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-400">
              {pagination ? pagination.total : monitors.length}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 px-5 pb-5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-zinc-800/40"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      ) : monitors.length === 0 ? (
        <div className="flex flex-col items-center px-6 pb-14 pt-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
            <Globe className="h-7 w-7 text-zinc-500" />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-zinc-200">
            {pagination?.page > 1
              ? 'Bu sayfada monitör yok'
              : 'Henüz monitör yok'}
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
            {pagination?.page > 1
              ? 'Başka bir sayfaya geç ya da sayfa boyutunu küçült.'
              : "İlk monitörünü ekleyerek sitelerinin durumunu takibe başla. URL'yi ekle, gerisini panel halleder."}
          </p>
          {pagination?.page > 1 ? (
            <button
              type="button"
              onClick={() => pagination.onPageChange(1)}
              className="mt-5 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800/60"
            >
              İlk Sayfaya Dön
            </button>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90"
            >
              İlk Monitörü Ekle
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-t border-zinc-800/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                  <th className="px-5 py-3">Site</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Yanıt</th>
                  <th className="px-4 py-3">Domain / Sunucu</th>
                  <th className="px-4 py-3">Aralık</th>
                  <th className="px-4 py-3">Son Kontrol</th>
                  <th className="px-5 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {monitors.map((m) => {
                  const checking = checkingIds.has(m.id);
                  return (
                    <tr
                      key={m.id}
                      className={`transition-colors hover:bg-zinc-800/30 ${
                        !m.enabled ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="max-w-[320px] px-5 py-4">
                        <div className="truncate font-semibold text-zinc-100">
                          {m.name}
                        </div>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-zinc-500 hover:text-indigo-400"
                        >
                          <span className="truncate">{m.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        {m.notes ? (
                          <p className="mt-1 truncate text-xs text-zinc-600">
                            {m.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={m.status} />
                      </td>
                      <td
                        className={`px-4 py-4 font-mono text-[13px] font-medium ${responseTimeClass(
                          m.lastResponseTime
                        )}`}
                      >
                        {formatResponseTime(m.lastResponseTime)}
                      </td>
                      <td className="px-4 py-4">
                        {m.domain || m.server ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {m.domain && (
                              <span
                                className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-400 ring-1 ring-cyan-500/20"
                                title={`Domain: ${m.domain.name}`}
                              >
                                {m.domain.name}
                              </span>
                            )}
                            {m.server && (
                              <span
                                className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-400 ring-1 ring-violet-500/20"
                                title={`Sunucu: ${m.server.name}`}
                              >
                                {m.server.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-zinc-400">
                        {formatInterval(m.interval)}
                      </td>
                      <td className="px-4 py-4 text-zinc-500">
                        {timeAgo(m.lastCheckedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton
                            title="Şimdi kontrol et"
                            onClick={() => onCheck(m)}
                            className={checking ? 'text-indigo-400' : ''}
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`}
                            />
                          </IconButton>
                          <IconButton
                            title="Kontrol geçmişi"
                            onClick={() => onHistory(m)}
                          >
                            <History className="h-4 w-4" />
                          </IconButton>
                          <IconButton title="Düzenle" onClick={() => onEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            title="Sil"
                            onClick={() => onDelete(m)}
                            className="hover:bg-rose-500/10 hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pagination && (
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              onPageChange={pagination.onPageChange}
              onLimitChange={pagination.onLimitChange}
            />
          )}
        </>
      )}
    </div>
  );
}
