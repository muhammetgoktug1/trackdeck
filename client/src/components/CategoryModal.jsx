import { useEffect, useState } from 'react';
import { X, Loader2, Tag } from 'lucide-react';

// Sunucudaki paletle birebir aynı (routes/categories.js)
export const CATEGORY_PALETTE = [
  { color: '#64748b', label: 'Kurşun Grisi' },
  { color: '#10b981', label: 'Zümrüt' },
  { color: '#3b82f6', label: 'Mavi' },
  { color: '#f59e0b', label: 'Amber' },
  { color: '#ef4444', label: 'Kırmızı' },
  { color: '#a855f7', label: 'Mor' },
];

const inputClass =
  'w-full rounded-xl border border-zinc-700/70 bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20';

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500';

const EMPTY_FORM = { name: '', color: '#64748b' };

// contextLabel: hangi bağlamda kullanıldığı (varsayılan notlar); ipucu metninde
export default function CategoryModal({ open, category, saving, error, onSave, onClose, contextLabel = 'not' }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm(
        category
          ? { name: category.name, color: category.color ?? '#64748b' }
          : EMPTY_FORM
      );
    }
  }, [open, category]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    onSave({ name: form.name.trim(), color: form.color });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 animate-pop-in">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
            <Tag className="h-4 w-4" />
            {category ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className={labelClass} htmlFor="c-name">
              Kategori Adı
            </label>
            <input
              id="c-name"
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Örn: Proje Fikirleri"
              required
              maxLength={60}
              autoFocus
            />
            <p className="mt-1.5 text-[11px] text-zinc-600">
              {contextLabel === 'not'
                ? "Notlara eklenirken listeden seçilir; notlar bu kategoriye göre filtrelenebilir"
                : "Şifre kayıtlarına eklenirken listeden seçilir; kayıtlar bu kategoriye göre filtrelenebilir"}
            </p>
          </div>

          <div>
            <span className={labelClass}>Renk</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_PALETTE.map(({ color }) => (
                <button
                  key={color}
                  type="button"
                  title={`#${color.slice(1)}`}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={`h-9 w-9 rounded-xl ring-2 transition-transform hover:scale-110 ${
                    form.color === color ? 'ring-white/80' : 'ring-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {form.color === color && (
                    <span className="text-[10px] font-black text-white drop-shadow">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-400 ring-1 ring-rose-500/20">
              {error}
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {category ? 'Kaydet' : 'Kategoriyi Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
