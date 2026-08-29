import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import PageContainer from '../components/PageContainer.jsx';
import Pagination from '../components/Pagination.jsx';
import { api } from '../lib/api.js';

const inputClass =
  'w-full rounded-xl border border-zinc-700/70 bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20';

const REVEAL_TIMEOUT_MS = 25_000;

function CredentialRow({ item, onEdit, onDelete, onToast }) {
  // reveal: { password, timer } — süre sonunda otomatik gizlenir
  const [revealed, setRevealed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const hideSoon = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(null), REVEAL_TIMEOUT_MS);
  };

  const toggleReveal = async () => {
    if (revealed) {
      clearTimeout(timerRef.current);
      setRevealed(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.revealCredential(item.id);
      setRevealed(res.password);
      hideSoon();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    try {
      let value = revealed;
      if (!value) {
        const res = await api.revealCredential(item.id);
        value = res.password;
      }
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      onToast(err.message || 'Kopyalanamadı', 'error');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-zinc-800/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 ring-1 ring-zinc-700/60">
        <KeyRound className="h-4 w-4 text-zinc-500" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-100">{item.title}</span>
          {item.category && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: `${item.category.color ?? '#64748b'}22`,
                color: item.category.color ?? '#94a3b8',
                boxShadow: `inset 0 0 0 1px ${item.category.color ?? '#64748b'}55`,
              }}
            >
              {item.category.name}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          {item.username && <span className="font-medium text-zinc-400">{item.username}</span>}
          <span className="font-mono text-zinc-500" title="Göstermek için göz ikonuna bas">
            {revealed ? revealed : item.hasPassword ? '••••••••••' : 'şifre yok'}
          </span>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-400/80 transition-colors hover:text-indigo-300"
            >
              siteye git <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          title={revealed ? 'Gizle' : 'Şifreyi göster (25 sn)'}
          onClick={toggleReveal}
          disabled={!item.hasPassword || loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : revealed ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          title="Şifreyi kopyala"
          onClick={copyPassword}
          disabled={!item.hasPassword}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
        <button
          type="button"
          title="Düzenle"
          onClick={() => onEdit(item)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Sil"
          onClick={() => onDelete(item)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function CredentialsPage({
  list,
  loading,
  categories = [],
  activeCategory = null,
  onCategoryChange,
  query = '',
  onQueryChange,
  onEdit,
  onDelete,
  onAdd,
  onPageChange,
  onLimitChange,
}) {
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  return (
    <PageContainer>
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-white">Hesap Kayıtları</h2>
            {!loading && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-400">
                {list.total}
              </span>
            )}
          </div>

          <div className="relative ml-auto w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              className={`${inputClass} pl-9`}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Başlık veya kullanıcı adı ara..."
              maxLength={100}
            />
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800/60 px-5 pb-3">
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

        {loading ? (
          <div className="flex flex-col gap-2 px-5 pb-5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-zinc-800/40"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        ) : list.data.length === 0 ? (
          <div className="flex flex-col items-center px-6 pb-14 pt-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
              <KeyRound className="h-7 w-7 text-zinc-500" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-zinc-200">
              {query || activeCategory ? 'Sonuç bulunamadı' : 'Henüz hesap kaydı yok'}
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
              {query || activeCategory
                ? 'Aramanı temizle ya da filtreleri kaldır.'
                : 'Instagram, Gmail, pazaryeri, sunucu... tüm hesap şifrelerini güvenle burada tut.'}
            </p>
            {!query && !activeCategory && (
              <button
                type="button"
                onClick={onAdd}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90"
              >
                İlk Kaydı Ekle
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-zinc-800/50">
              {list.data.map((item) => (
                <CredentialRow
                  key={item.id}
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToast={showToast}
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

        {toast && (
          <p
            className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ring-1 ${
              toast.type === 'error'
                ? 'bg-rose-950/95 text-rose-300 ring-rose-500/30'
                : 'bg-emerald-950/95 text-emerald-300 ring-emerald-500/30'
            }`}
          >
            {toast.message}
          </p>
        )}
      </div>
    </PageContainer>
  );
}
