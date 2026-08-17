import { useEffect, useState } from 'react';
import {
  MessageCircle,
  Slack,
  MessagesSquare,
  Loader2,
  Save,
  Send,
  CircleCheck,
  CircleX,
  BellRing,
  Plug,
  ChevronDown,
} from 'lucide-react';
import { renderTemplate } from '../lib/format.js';

const THRESHOLD_OPTIONS = [60, 45, 30, 15, 7, 3, 1];

const CHANNEL_META = {
  whatsapp: {
    icon: MessageCircle,
    title: 'WhatsApp Bağlantısı',
    subtitle: 'cms_api ile aynı köprü: POST { session, chatId, text } + X-Api-Key',
    iconClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    ringClass: 'ring-emerald-500/20',
  },
  slack: {
    icon: Slack,
    title: 'Slack Bağlantısı',
    subtitle: 'Incoming Webhook üzerinden mesaj gönderilir',
    iconClass: 'text-fuchsia-400',
    bgClass: 'bg-fuchsia-500/10',
    ringClass: 'ring-fuchsia-500/20',
  },
  discord: {
    icon: MessagesSquare,
    title: 'Discord Bağlantısı',
    subtitle: 'Kanal/Discord Webhook üzerinden mesaj gönderilir',
    iconClass: 'text-indigo-400',
    bgClass: 'bg-indigo-500/10',
    ringClass: 'ring-indigo-500/20',
  },
};

const TEMPLATE_FIELDS = {
  uptime: [
    {
      key: 'uptimeDown',
      title: 'Site Erişilemez (🔴 down)',
      vars: ['name', 'url', 'code', 'reason', 'time'],
    },
    {
      key: 'uptimeUp',
      title: 'Site Düzeldi (🟢 up)',
      vars: ['name', 'url', 'responseTime', 'time'],
    },
  ],
  domain: [
    {
      key: 'domainExpiry',
      title: 'Domain Bitiş Uyarısı (⏰)',
      vars: ['name', 'days', 'expiresAt', 'time'],
    },
    {
      key: 'domainExpired',
      title: 'Domain Süresi Doldu (⛔)',
      vars: ['name', 'expiresAt', 'time'],
    },
  ],
};

// Önizlemede kullanılan örnek değerler
const PREVIEW_VARS = {
  name: 'ornek.com',
  url: 'https://ornek.com',
  code: 'HTTP 503',
  reason: 'Sunucu hata döndürdü',
  responseTime: '742',
  days: '30',
  expiresAt: '15 Mar 2027',
};

const inputClass =
  'w-full rounded-xl border border-zinc-700/70 bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20';

function Switch({ checked, onChange }) {
  return (
    <span className="relative inline-block shrink-0">
      <input
        type="checkbox"
        className="peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-zinc-700 transition-colors checked:bg-emerald-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
    </span>
  );
}

// Bildirim seçeneği: başlık + anahtar; altındaki içerik (eşikler/şablonlar) genişletilerek açılır
function NotificationBlock({ title, description, checked, onChange, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
          aria-expanded={open}
        >
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
          <span className="text-sm font-medium text-zinc-300">
            {title}
            <span className="mt-0.5 block text-xs font-normal leading-relaxed text-zinc-600">
              {description}
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-zinc-700">
              eşik ve mesaj şablonu ayarları {open ? 'aşağıda' : 'için tıkla'}
            </span>
          </span>
        </button>
        <Switch
          checked={checked}
          onChange={(v) => {
            onChange(v);
            // bildirim açılınca ayarları göster, kapanınca topla
            setOpen(v);
          }}
        />
      </div>
      {open && children && (
        <div
          className={`mt-3 animate-fade-in border-t border-zinc-800/70 pt-3 transition-opacity ${
            checked ? '' : 'pointer-events-none opacity-40'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function TemplateField({ field, value, defaultValue, onChange, previewTime }) {
  const effective = value || defaultValue || '';
  const preview = renderTemplate(effective, { ...PREVIEW_VARS, time: previewTime });
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {field.title}
        </span>
        {field.vars.map((v) => (
          <code
            key={v}
            className="rounded-md bg-zinc-800/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 ring-1 ring-zinc-700/60"
          >
            {'{' + v + '}'}
          </code>
        ))}
      </div>
      <textarea
        id={`tpl-${field.key}`}
        className="w-full min-h-[88px] resize-y rounded-xl border border-zinc-700/70 bg-zinc-800/50 px-3.5 py-2.5 font-mono text-[13px] leading-relaxed text-zinc-100 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultValue || ''}
        maxLength={2000}
      />
      <div className="mt-2 rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Önizleme
        </p>
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
          {preview || '—'}
        </p>
      </div>
    </div>
  );
}

export default function IntegrationPage({
  type,
  config,
  loading,
  saving,
  testing,
  onSave,
  onTest,
}) {
  const [form, setForm] = useState(null);
  const meta = CHANNEL_META[type] ?? CHANNEL_META.whatsapp;
  const isWebhook = type === 'slack' || type === 'discord';
  const ChannelIcon = meta.icon;

  useEffect(() => {
    if (config) {
      setForm({
        apiUrl: config.apiUrl ?? '',
        apiKey: config.apiKey ?? '',
        session: config.session ?? 'default',
        chatId: config.chatId ?? '',
        webhookUrl: config.webhookUrl ?? '',
        enabled: config.enabled ?? false,
        notifyUptime: config.notifyUptime ?? true,
        notifyDomains: config.notifyDomains ?? true,
        domainThresholds: config.domainThresholds ?? [45, 30, 15],
        templates: {
          uptimeDown: config.templates?.uptimeDown ?? '',
          uptimeUp: config.templates?.uptimeUp ?? '',
          domainExpiry: config.templates?.domainExpiry ?? '',
          domainExpired: config.templates?.domainExpired ?? '',
        },
      });
    }
  }, [config]);

  if (loading || !form) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-900/50" />
        <div className="h-56 animate-pulse rounded-2xl bg-zinc-900/50" />
      </div>
    );
  }

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleThreshold = (t) => {
    setForm((f) => ({
      ...f,
      domainThresholds: f.domainThresholds.includes(t)
        ? f.domainThresholds.filter((x) => x !== t).sort((a, b) => b - a)
        : [...f.domainThresholds, t].sort((a, b) => b - a),
    }));
  };

  const setTemplate = (key, value) => {
    setForm((f) => ({ ...f, templates: { ...f.templates, [key]: value } }));
  };

  const defaults = config?.templateDefaults ?? {};
  const previewTime = new Date().toLocaleString('tr-TR');
  const thresholds = form.domainThresholds;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {/* Bağlantı kartı */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${meta.bgClass} ${meta.ringClass}`}
            >
              <ChannelIcon className={`h-5 w-5 ${meta.iconClass}`} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{meta.title}</h2>
              <p className="text-xs text-zinc-500">{meta.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs font-semibold ${
                form.enabled ? 'text-emerald-400' : 'text-zinc-500'
              }`}
            >
              {form.enabled ? 'Aktif' : 'Pasif'}
            </span>
            <Switch checked={form.enabled} onChange={(v) => set('enabled', v)} />
          </div>
        </div>

        {isWebhook ? (
          <div className="px-6 py-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="int-webhook">
              Webhook URL
            </label>
            <input
              id="int-webhook"
              className={inputClass}
              value={form.webhookUrl}
              onChange={(e) => set('webhookUrl', e.target.value)}
              placeholder={
                type === 'slack'
                  ? 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX'
                  : 'https://discord.com/api/webhooks/...'
              }
              autoComplete="off"
            />
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              {type === 'slack'
                ? 'Slack workspace\'inde Incoming Webhook oluşturup adresini buraya yapıştır.'
                : 'Discord kanal ayarları → Entegrasyonlar → Webhook oluştur ve adresini buraya yapıştır.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="wa-url">
                API URL
              </label>
              <input
                id="wa-url"
                className={inputClass}
                value={form.apiUrl}
                onChange={(e) => set('apiUrl', e.target.value)}
                placeholder="http://sunucu:port/whatsapp/send"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="wa-key">
                API Key
              </label>
              <input
                id="wa-key"
                type="password"
                className={inputClass}
                value={form.apiKey}
                onChange={(e) => set('apiKey', e.target.value)}
                placeholder="X-Api-Key değeri"
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="wa-session">
                  Session
                </label>
                <input
                  id="wa-session"
                  className={inputClass}
                  value={form.session}
                  onChange={(e) => set('session', e.target.value)}
                  placeholder="default"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="wa-chat">
                  Chat ID
                </label>
                <input
                  id="wa-chat"
                  className={inputClass}
                  value={form.chatId}
                  onChange={(e) => set('chatId', e.target.value)}
                  placeholder="905xxxxxxxxx@c.us"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-zinc-800/60 px-6 py-4">
          {config?.lastTestedAt ? (
            <div className="flex min-w-0 items-center gap-2 text-xs">
              {config.lastTestOk ? (
                <>
                  <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="truncate text-zinc-500">
                    Son test başarılı · {new Date(config.lastTestedAt).toLocaleString('tr-TR')}
                  </span>
                </>
              ) : (
                <>
                  <CircleX className="h-4 w-4 shrink-0 text-rose-400" />
                  <span className="truncate text-zinc-500">
                    Son test başarısız · {new Date(config.lastTestedAt).toLocaleString('tr-TR')}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-xs text-zinc-600">Henüz test yapılmadı</span>
          )}
          <button
            type="button"
            disabled={testing || saving}
            onClick={() => onTest(form)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-zinc-700 px-3.5 py-2 text-[13px] font-semibold text-zinc-300 transition-colors hover:bg-zinc-800/60 disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Bağlantıyı Test Et
          </button>
        </div>
      </div>

      {/* Bildirimler + şablonlar */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
        <div className="flex items-center gap-3 border-b border-zinc-800/80 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <BellRing className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Bildirimler</h2>
            <p className="text-xs text-zinc-500">hangi durumlarda mesaj alınacağını seç</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-6 py-5">
          <NotificationBlock
            title="Uptime bildirimleri"
            description="Bir site erişilemez hale geldiğinde ve düzeldiğinde mesaj gönderilir (🔴/🟢)"
            checked={form.notifyUptime}
            onChange={(v) => set('notifyUptime', v)}
          >
            <div className="flex flex-col gap-4">
              {TEMPLATE_FIELDS.uptime.map((f) => (
                <TemplateField
                  key={f.key}
                  field={f}
                  value={form.templates[f.key] ?? ''}
                  defaultValue={defaults[f.key]}
                  onChange={(v) => setTemplate(f.key, v)}
                  previewTime={previewTime}
                />
              ))}
            </div>
          </NotificationBlock>

          <NotificationBlock
            title="Domain bitiş bildirimleri"
            description="Domain süresi seçilen eşik günlerine geldiğinde mesaj gönderilir"
            checked={form.notifyDomains}
            onChange={(v) => set('notifyDomains', v)}
          >
            <p className="text-sm font-medium text-zinc-300">
              Kalan gün eşikleri
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
                çoklu seçim
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {THRESHOLD_OPTIONS.map((t) => {
                const selected = thresholds.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleThreshold(t)}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 transition-colors ${
                      selected
                        ? 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/40'
                        : 'bg-zinc-800/50 text-zinc-500 ring-zinc-700/60 hover:text-zinc-300'
                    }`}
                  >
                    {t} gün
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-600">
              {thresholds.length > 0
                ? `Domain süresi ${thresholds
                    .slice()
                    .sort((a, b) => b - a)
                    .map((t) => `${t} gün`)
                    .join(', ')} kaldığında sırayıyla bildirilir; süre dolarsa ayrıca uyarılır.`
                : 'Hiç eşik seçilmedi — domain bitiş bildirimi gönderilmez.'}
            </p>

            <div className="mt-4 flex flex-col gap-4">
              {TEMPLATE_FIELDS.domain.map((f) => (
                <TemplateField
                  key={f.key}
                  field={f}
                  value={form.templates[f.key] ?? ''}
                  defaultValue={defaults[f.key]}
                  onChange={(v) => setTemplate(f.key, v)}
                  previewTime={previewTime}
                />
              ))}
            </div>
          </NotificationBlock>
        </div>
      </div>

      {/* Aksiyonlar */}
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(form)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </button>
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-zinc-700">
        <Plug className="h-3.5 w-3.5" />
        Ayarlar veritabanında saklanır (.env gerekmez) · test gerçek mesaj gönderir
      </p>
    </div>
  );
}
