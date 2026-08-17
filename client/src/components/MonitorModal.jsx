import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { intervalHint } from '../lib/format.js';

const EMPTY_FORM = {
  name: '',
  url: '',
  method: 'GET',
  interval: 60,
  enabled: true,
  notes: '',
  domain: '',
  server: '',
};

const inputClass =
  'w-full rounded-xl border border-zinc-700/70 bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20';

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500';

export default function MonitorModal({
  open,
  monitor,
  saving,
  error,
  domainOptions = [],
  serverOptions = [],
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm(
        monitor
          ? {
              name: monitor.name,
              url: monitor.url,
              method: monitor.method,
              interval: monitor.interval,
              enabled: monitor.enabled,
              notes: monitor.notes ?? '',
              domain: monitor.domain?.id ?? '',
              server: monitor.server?.id ?? '',
            }
          : EMPTY_FORM
      );
    }
  }, [open, monitor]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (key) => (e) => {
    const value =
      e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      interval: Number(form.interval),
      domain: form.domain || null,
      server: form.server || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 animate-pop-in">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-[15px] font-bold text-white">
            {monitor ? 'Monitörü Düzenle' : 'Yeni Monitör'}
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
            <label className={labelClass} htmlFor="m-name">
              Monitör Adı
            </label>
            <input
              id="m-name"
              className={inputClass}
              value={form.name}
              onChange={set('name')}
              placeholder="Örn: Kişisel Blog"
              required
              maxLength={120}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="m-url">
              URL
            </label>
            <input
              id="m-url"
              type="url"
              className={inputClass}
              value={form.url}
              onChange={set('url')}
              placeholder="https://ornek.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="m-method">
                Yöntem
              </label>
              <select
                id="m-method"
                className={inputClass}
                value={form.method}
                onChange={set('method')}
              >
                <option value="GET">GET</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="m-interval">
                Kontrol Aralığı (sn)
              </label>
              <input
                id="m-interval"
                type="number"
                className={inputClass}
                value={form.interval}
                onChange={set('interval')}
                min={10}
                max={86400}
                step={10}
                required
              />
              {intervalHint(form.interval) && (
                <p className="mt-1.5 text-[11px] font-medium text-zinc-600">
                  {intervalHint(form.interval)} ara ile kontrol edilir
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="m-domain">
                Domain <span className="font-normal normal-case text-zinc-600">(opsiyonel)</span>
              </label>
              <select
                id="m-domain"
                className={inputClass}
                value={form.domain}
                onChange={set('domain')}
              >
                <option value="">— Yok —</option>
                {domainOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="m-server">
                Sunucu <span className="font-normal normal-case text-zinc-600">(opsiyonel)</span>
              </label>
              <select
                id="m-server"
                className={inputClass}
                value={form.server}
                onChange={set('server')}
              >
                <option value="">— Yok —</option>
                {serverOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="m-notes">
              Notlar <span className="font-normal normal-case text-zinc-600">(opsiyonel)</span>
            </label>
            <textarea
              id="m-notes"
              className={`${inputClass} min-h-[72px] resize-y`}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Bu siteyle ilgili hatırlatmalar, yenileme tarihleri, notlar..."
              maxLength={2000}
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3">
            <span className="text-sm font-medium text-zinc-300">
              Monitör aktif
              <span className="block text-xs font-normal text-zinc-600">
                Pasif monitörler kontrol edilmez
              </span>
            </span>
            <span className="relative inline-block">
              <input
                type="checkbox"
                className="peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-zinc-700 transition-colors checked:bg-indigo-500"
                checked={form.enabled}
                onChange={set('enabled')}
              />
              <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </span>
          </label>

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
              {monitor ? 'Kaydet' : 'Monitörü Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
