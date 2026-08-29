import { Pencil, Trash2, Tag } from 'lucide-react';
import Pagination from '../components/Pagination.jsx';
import PageContainer from '../components/PageContainer.jsx';

export default function CategoriesPage({
  list,
  loading,
  onEdit,
  onDelete,
  onAdd,
  onPageChange,
  onLimitChange,
}) {
  return (
    <PageContainer>
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-white">Not Kategorileri</h2>
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
              className="h-12 animate-pulse rounded-xl bg-zinc-800/40"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      ) : list.data.length === 0 ? (
        <div className="flex flex-col items-center px-6 pb-14 pt-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
            <Tag className="h-7 w-7 text-zinc-500" />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-zinc-200">
            Henüz kategori yok
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
            Kategorileri bir kez burada tanımla; not eklerken listeden seç,
            notları kategoriye göre filtrele.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90"
          >
            İlk Kategoriyi Ekle
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-t border-zinc-800/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {list.data.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-zinc-800/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1"
                          style={{
                            backgroundColor: `${c.color}22`,
                            color: c.color,
                            boxShadow: `inset 0 0 0 1px ${c.color}55`,
                          }}
                        >
                          <Tag className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-semibold text-zinc-100">{c.name}</span>
                      </div>
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
