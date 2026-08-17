import { Pencil, Trash2, Server } from 'lucide-react';
import Pagination from '../components/Pagination.jsx';
import { formatDateTR } from '../lib/format.js';

export default function ServersPage({
  list,
  loading,
  onEdit,
  onDelete,
  onAdd,
  onPageChange,
  onLimitChange,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-white">Sunucular</h2>
          {!loading && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-400">
              {list.total}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 px-5 pb-5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-zinc-800/40"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      ) : list.data.length === 0 ? (
        <div className="flex flex-col items-center px-6 pb-14 pt-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
            <Server className="h-7 w-7 text-zinc-500" />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-zinc-200">
            Henüz sunucu yok
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
            Sunucularını ekleyerek sağlayıcı ve IP bilgilerini tek yerden takip
            et; monitörlere de bağlayabilirsin.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90"
          >
            İlk Sunucuyu Ekle
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-t border-zinc-800/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                  <th className="px-5 py-3">Sunucu</th>
                  <th className="px-4 py-3">Sağlayıcı</th>
                  <th className="px-4 py-3">IP Adresi</th>
                  <th className="px-4 py-3">Satın Alma</th>
                  <th className="px-5 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {list.data.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-zinc-800/30">
                    <td className="max-w-[320px] px-5 py-4">
                      <div className="truncate font-semibold text-zinc-100">
                        {s.name}
                      </div>
                      {s.notes ? (
                        <p className="mt-0.5 truncate text-xs text-zinc-600">
                          {s.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      {s.provider?.name || <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-4 font-mono text-[13px] text-zinc-300">
                      {s.ipAddress || <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      {s.purchasedAt ? (
                        formatDateTR(s.purchasedAt)
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          title="Düzenle"
                          onClick={() => onEdit(s)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Sil"
                          onClick={() => onDelete(s)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={list.page}
            limit={list.limit}
            total={list.total}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
          />
        </>
      )}
    </div>
  );
}
