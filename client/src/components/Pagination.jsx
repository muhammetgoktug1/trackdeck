import { ChevronLeft, ChevronRight } from 'lucide-react';

function buildPageList(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const wanted = [1, 2, page - 1, page, page + 1, totalPages - 1, totalPages]
    .filter((p) => p >= 1 && p <= totalPages);
  const unique = [...new Set(wanted)].sort((a, b) => a - b);

  const result = [];
  let prev = 0;
  for (const p of unique) {
    if (p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

const SIZE_OPTIONS = [10, 20, 50, 100];

export default function Pagination({ page, limit, total, onPageChange, onLimitChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = buildPageList(page, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-zinc-800/80 px-5 py-3.5 sm:flex-row">
      <div className="flex items-center gap-3 text-[13px] text-zinc-500">
        <span>
          <span className="font-semibold text-zinc-300">{from}–{to}</span> / {total} kayıt
        </span>
        <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
        <label className="hidden items-center gap-2 sm:flex">
          Sayfa boyutu
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-lg border border-zinc-700/70 bg-zinc-800/50 px-2 py-1 text-[13px] font-semibold text-zinc-300 outline-none focus:border-indigo-500/60"
          >
            {SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          title="Önceki sayfa"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1.5 text-zinc-600">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-8 rounded-lg px-2.5 text-[13px] font-semibold transition-colors ${
                p === page
                  ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          title="Sonraki sayfa"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
