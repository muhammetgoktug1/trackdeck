import { Pencil, Trash2, Pin, PinOff, StickyNote, Link2, Paperclip } from 'lucide-react';
import Pagination from '../components/Pagination.jsx';
import PageContainer from '../components/PageContainer.jsx';
import { formatDateTR, formatFileSize } from '../lib/format.js';

function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
  const hasExtras = (note.links?.length ?? 0) > 0 || (note.attachments?.length ?? 0) > 0;

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-zinc-900/50 p-5 transition-colors ${
        note.pinned
          ? 'border-amber-500/30 hover:border-amber-500/50'
          : 'border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <h3 className="min-w-0 break-words text-[15px] font-semibold leading-snug text-zinc-100">
            {note.title}
          </h3>
          {note.category && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: `${note.category.color ?? '#64748b'}22`,
                color: note.category.color ?? '#94a3b8',
                boxShadow: `inset 0 0 0 1px ${note.category.color ?? '#64748b'}55`,
              }}
            >
              {note.category.name}
            </span>
          )}
          {note.pinned && <Pin className="mt-0.5 h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />}
        </div>
      </div>

      {note.content ? (
        <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
          {note.content}
        </p>
      ) : (
        !hasExtras && <p className="mt-2 text-sm italic text-zinc-600">içerik yok</p>
      )}

      {/* Bağlantılar */}
      {note.links?.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {note.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="group/link flex min-w-0 items-center gap-1.5 text-[13px] text-zinc-400 transition-colors hover:text-indigo-400"
              title={l.url}
            >
              <Link2 className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover/link:text-indigo-400" />
              <span className="truncate">{l.label || l.url}</span>
            </a>
          ))}
        </div>
      )}

      {/* Dosya ekleri */}
      {note.attachments?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.attachments.map((att) => (
            <a
              key={att.id}
              href={`/uploads/${att.storedName}`}
              download={att.fileName}
              title={`${att.fileName} (${formatFileSize(att.size)}) indir`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-zinc-800/70 px-2.5 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-zinc-700/60 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <Paperclip className="h-3 w-3 shrink-0 text-zinc-500" />
              <span className="truncate">{att.fileName}</span>
              <span className="shrink-0 text-[10px] text-zinc-600">
                {formatFileSize(att.size)}
              </span>
            </a>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800/70 pt-3">
        <span className="text-xs text-zinc-600">{formatDateTR(note.createdAt)}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title={note.pinned ? 'Sabitlemeyi kaldır' : 'Listeye sabitle'}
            onClick={() => onTogglePin(note)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-zinc-800 ${
              note.pinned ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'
            }`}
          >
            {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
          <button
            type="button"
            title="Düzenle"
            onClick={() => onEdit(note)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Sil"
            onClick={() => onDelete(note)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotesPage({
  list,
  loading,
  categories = [],
  activeCategory = null,
  onCategoryChange,
  onEdit,
  onDelete,
  onTogglePin,
  onAdd,
  onPageChange,
  onLimitChange,
}) {
  return (
    <PageContainer>
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-white">Notlar</h2>
          {!loading && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-400">
              {list.total}
            </span>
          )}
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => onCategoryChange(null)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 transition-colors ${
                activeCategory === null
                  ? 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/40'
                  : 'bg-zinc-800/50 text-zinc-500 ring-zinc-700/60 hover:text-zinc-300'
              }`}
            >
              Tümü
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onCategoryChange(activeCategory === c.id ? null : c.id)}
                className="rounded-full px-3 py-1 text-[11px] font-semibold ring-1 transition-colors"
                style={
                  activeCategory === c.id
                    ? {
                        backgroundColor: `${c.color}25`,
                        color: c.color,
                        boxShadow: `inset 0 0 0 1px ${c.color}80`,
                      }
                    : { backgroundColor: 'rgba(39,39,42,0.5)', color: '#a1a1aa' }
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-zinc-800/40"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      ) : list.data.length === 0 ? (
        <div className="flex flex-col items-center px-6 pb-14 pt-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
            <StickyNote className="h-7 w-7 text-zinc-500" />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-zinc-200">Henüz not yok</h3>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
            SSH bilgileri, yenileme tarihleri, yapılacaklar... aklında ne varsa
            buraya not düş, önemli olanları sabitle.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90"
          >
            İlk Notu Ekle
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.data.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
              />
            ))}
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
