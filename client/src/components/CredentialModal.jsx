import { useEffect, useState } from 'react';
import { X, Loader2, Dices, Eye, EyeOff, KeyRound } from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-zinc-700/70 bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20';

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500';

const EMPTY_FORM = { title: '', category: '', username: '', password: '', url: '', notes: '' };

// Güçlü şifre üretici: karışıklık yaratan karakterler (0O1lI|) hariç
function generatePassword(length = 16) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+';
  const random = new Uint32Array(length);
  crypto.getRandomValues(random);
  return Array.from(random, (r) => charset[r % charset.length]).join('');
}

export default function CredentialModal({
  open,
  credential,
  saving,
  error,
  categoryOptions = [],
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        credential
          ? {
              title: credential.title,
              category: credential.category?.id ?? '',
              username: credential.username ?? '',
              // düzenlemede mevcut şifre getirilmez; boş bırakılırsa korunur
              password: '',
              url: credential.url ?? '',
              notes: credential.notes ?? '',
            }
          : EMPTY_FORM
      );
      setShowPassword(false);
    }
  }, [open, credential]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSave({
      title: form.title.trim(),
      category: form.category || null,
      username: form.username.trim(),
      // boş şifre = değişiklik yok (sunucu eskiyi korur); yeni kayıtta opsiyonel
      password: form.password,
      url: form.url.trim(),
      notes: form.notes.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 animate-pop-in">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
            <KeyRound className="h-4 w-4" />
            {credential ? 'Kaydı Düzenle' : 'Yeni Hesap Kaydı'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto px-6 py-5">
          <div>
            <label className={labelClass} htmlFor="cr-title">
              Başlık
            </label>
            <input
              id="cr-title"
              className={inputClass}
              value={form.title}
              onChange={set('title')}
              placeholder="Örn: Trendyol Satıcı Hesabı"
              required
              maxLength={120}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="cr-category">
              Kategori <span className="font-normal normal-case text-zinc-600">(opsiyonel)</span>
            </label>
            <select
              id="cr-category"
              className={inputClass}
              value={form.category}
              onChange={set('category')}
            >
              <option value="">— Yok —</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-zinc-600">
              Tanımlar "Şifreler → Kategoriler" sekmesinden yönetilir
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="cr-username">
              Kullanıcı Adı / E-posta
            </label>
            <input
              id="cr-username"
              className={inputClass}
              value={form.username}
              onChange={set('username')}
              placeholder="ornek@gmail.com"
              maxLength={200}
              autoComplete="off"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="cr-password">
              Şifre{' '}
              {credential && (
                <span className="font-normal normal-case text-zinc-600">
                  (boş bırak = mevcut şifre korunur)
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="cr-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-10 font-mono`}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? 'Gizle' : 'Göster'}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, password: generatePassword() }));
                  setShowPassword(true);
                }}
                title="Güçlü şifre üret"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-700 px-3 text-[12px] font-semibold text-zinc-300 transition-colors hover:bg-zinc-800/60"
              >
                <Dices className="h-3.5 w-3.5" />
                Üret
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="cr-url">
              Site Adresi <span className="font-normal normal-case text-zinc-600">(opsiyonel)</span>
            </label>
            <input
              id="cr-url"
              className={inputClass}
              value={form.url}
              onChange={set('url')}
              placeholder="https://..."
              maxLength={2048}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="cr-notes">
              Notlar <span className="font-normal normal-case text-zinc-600">(opsiyonel)</span>
            </label>
            <textarea
              id="cr-notes"
              className={`${inputClass} min-h-[64px] resize-y`}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Kurtarma e-postası, 2FA notları, API anahtar bilgileri..."
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
              {credential ? 'Kaydet' : 'Kaydı Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
