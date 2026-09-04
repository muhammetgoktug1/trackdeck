import { Pencil, Trash2, Search, UserRound, Building2 } from 'lucide-react';
import Pagination from '../components/Pagination.jsx';
import PageContainer from '../components/PageContainer.jsx';

const inputClass =
  'w-full rounded-xl border border-zinc-700/70 bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20';

function initials(customer) {
  return `${customer.ad?.[0] ?? ''}${customer.soyadi?.[0] ?? ''}`.toUpperCase() || '?';
}

export default function CustomersPage({
  list,
  loading,
  query,
  onQueryChange,
  onEdit,
  onDelete,
  onAdd,
  onPageChange,
  onLimitChange,
}) {
  const searching = query.trim().length > 0;

  return (
    <PageContainer>
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-white">Müşteriler</h2>
            {!loading && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-400">
                {list.total}
              </span>
            )}
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              className={`${inputClass} pl-9`}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Ad, soyadı, telefon veya mail ara..."
              maxLength={100}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2 px-5 pb-5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-zinc-800/40"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        ) : list.data.length === 0 ? (
          <div className="flex flex-col items-center px-6 pb-14 pt-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
              <UserRound className="h-7 w-7 text-zinc-500" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-zinc-200">
              {searching ? 'Aramayla eşleşen müşteri yok' : 'Henüz müşteri kaydı yok'}
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
              {searching
                ? 'Farklı bir ad, soyadı, telefon veya mail ile tekrar dene.'
                : 'Müşterilerin ad, soyadı, telefon ve mail bilgilerini tek yerden yönet.'}
            </p>
            {!searching && (
              <button
                type="button"
                onClick={onAdd}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90"
              >
                İlk Müşteriyi Ekle
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-t border-zinc-800/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                    <th className="px-5 py-3">Müşteri</th>
                    <th className="px-5 py-3">Şirket</th>
                    <th className="px-5 py-3">Telefon</th>
                    <th className="px-5 py-3">Mail</th>
                    <th className="px-5 py-3 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {list.data.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-zinc-800/30">
                      <td className="max-w-[240px] px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-bold text-indigo-300 ring-1 ring-indigo-500/20">
                            {initials(c)}
                          </span>
                          <span className="truncate font-semibold text-zinc-100">
                            {c.ad} {c.soyadi}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[200px] px-5 py-4">
                        {c.company?.name ? (
                          <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg bg-zinc-800/70 px-2 py-1 text-xs font-medium text-zinc-300 ring-1 ring-zinc-700/60">
                            <Building2 className="h-3 w-3 shrink-0 text-zinc-500" />
                            <span className="truncate">{c.company.name}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {c.telefon ? (
                          <a
                            href={`tel:${c.telefon.replace(/\s+/g, '')}`}
                            className="text-zinc-300 transition-colors hover:text-indigo-300"
                          >
                            {c.telefon}
                          </a>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="max-w-[260px] px-5 py-4">
                        {c.mail ? (
                          <a
                            href={`mailto:${c.mail}`}
                            className="block truncate text-zinc-300 transition-colors hover:text-indigo-300"
                          >
                            {c.mail}
                          </a>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            title="Düzenle"
                            onClick={() => onEdit(c)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Sil"
                            onClick={() => onDelete(c)}
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
    </PageContainer>
  );
}
