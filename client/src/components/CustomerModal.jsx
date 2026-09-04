import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

const EMPTY_FORM = { ad: '', soyadi: '', telefon: '', mail: '', company: '' };

const inputClass =
  'w-full rounded-xl border border-zinc-700/70 bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20';

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500';

export default function CustomerModal({
  open,
  customer,
  saving,
  error,
  companyOptions = [],
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm(
        customer
          ? {
              ad: customer.ad,
              soyadi: customer.soyadi,
              telefon: customer.telefon ?? '',
              mail: customer.mail ?? '',
              company: customer.company?.id ?? '',
            }
          : EMPTY_FORM
      );
    }
  }, [open, customer]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    onSave({
      ad: form.ad.trim(),
      soyadi: form.soyadi.trim(),
      telefon: form.telefon.trim(),
      mail: form.mail.trim(),
      company: form.company || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 animate-pop-in">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-[15px] font-bold text-white">
            {customer ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="c-ad">
                Ad
              </label>
              <input
                id="c-ad"
                className={inputClass}
                value={form.ad}
                onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
                placeholder="Örn: Ahmet"
                required
                maxLength={80}
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="c-soyadi">
                Soyadı
              </label>
              <input
                id="c-soyadi"
                className={inputClass}
                value={form.soyadi}
                onChange={(e) => setForm((f) => ({ ...f, soyadi: e.target.value }))}
                placeholder="Örn: Yılmaz"
                required
                maxLength={80}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="c-telefon">
              Telefon <span className="font-normal normal-case text-zinc-600">(opsiyonel)</span>
            </label>
            <input
              id="c-telefon"
              className={inputClass}
              value={form.telefon}
              onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
              placeholder="Örn: 0532 000 00 00"
              maxLength={40}
              inputMode="tel"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="c-mail">
              Mail <span className="font-normal normal-case text-zinc-600">(opsiyonel)</span>
            </label>
            <input
              id="c-mail"
              type="email"
              className={inputClass}
              value={form.mail}
              onChange={(e) => setForm((f) => ({ ...f, mail: e.target.value }))}
              placeholder="ornek@firma.com"
              maxLength={160}
              inputMode="email"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="c-company">
              Şirket <span className="font-normal normal-case text-zinc-600">(opsiyonel)</span>
            </label>
            <select
              id="c-company"
              className={inputClass}
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            >
              <option value="">— Yok —</option>
              {companyOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-zinc-600">
              Liste "Şirketler" sekmesinden yönetilir; buradan seçilir
            </p>
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
              {customer ? 'Kaydet' : 'Müşteriyi Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
