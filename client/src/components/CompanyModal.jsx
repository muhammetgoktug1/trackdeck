import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

const EMPTY_FORM = { name: '', notes: '' };

const inputClass =
  'w-full rounded-xl border border-zinc-700/70 bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20';

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500';

export default function CompanyModal({ open, company, saving, error, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm(company ? { name: company.name, notes: company.notes ?? '' } : EMPTY_FORM);
    }
  }, [open, company]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    onSave({ name: form.name.trim(), notes: form.notes.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 animate-pop-in">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-[15px] font-bold text-white">
            {company ? 'Şirketi Düzenle' : 'Yeni Şirket'}
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
            <label className={labelClass} htmlFor="cp-name">
              Şirket Adı
            </label>
            <input
              id="cp-name"
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Örn: Yılmaz Yazılım A.Ş."
              required
              maxLength={120}
              autoFocus
            />
            <p className="mt-1.5 text-[11px] text-zinc-600">
              Müşteri formundaki şirket listesi buradan yönetilir
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="cp-notes">
              Notlar <span className="font-normal normal-case text-zinc-600">(opsiyonel)</span>
            </label>
            <textarea
              id="cp-notes"
              className={`${inputClass} min-h-[72px] resize-y`}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Sözleşme bilgileri, vergi no, yetkili kişiler..."
              maxLength={2000}
            />
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
              {company ? 'Kaydet' : 'Şirketi Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
