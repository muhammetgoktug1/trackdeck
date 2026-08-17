import { useEffect } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

const TYPE_META = {
  monitor: {
    title: 'Monitörü sil',
    note: '',
  },
  domain: {
    title: 'Domaini sil',
    note: 'Bağlı monitörlerdeki domain ilişkisi de kaldırılır.',
  },
  server: {
    title: 'Sunucuyu sil',
    note: 'Bağlı monitörlerdeki sunucu ilişkisi de kaldırılır.',
  },
  provider: {
    title: 'Sağlayıcıyı sil',
    note: 'Bağlı domain ve sunuculardaki sağlayıcı ilişkisi de kaldırılır.',
  },
  note: {
    title: 'Notu sil',
    note: '',
  },
};

export default function ConfirmModal({ target, deleting, onClose, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (target) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;

  const meta = TYPE_META[target.type] ?? TYPE_META.monitor;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/50 animate-pop-in">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 ring-1 ring-rose-500/20">
          <Trash2 className="h-5 w-5 text-rose-400" />
        </div>
        <h2 className="mt-4 text-[15px] font-bold text-white">{meta.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          <span className="font-semibold text-zinc-300">{target.item.name}</span> kalıcı
          olarak silinecek. Bu işlem geri alınamaz.
          {meta.note && <span className="mt-1 block text-zinc-600">{meta.note}</span>}
        </p>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}
