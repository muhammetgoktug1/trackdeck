import Integration from '../models/Integration.js';
import { DEFAULT_TEMPLATES, renderTemplate } from './messageTemplates.js';

const SEND_TIMEOUT_MS = 10_000;

// Tiplere göre değişen metin alanı: Slack "text", Discord "content"
const WEBHOOK_PAYLOAD_KEY = {
  slack: 'text',
  discord: 'content',
};

async function postJson(url, body, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const resBody = await res.json();
        detail = resBody.message || resBody.error || detail;
      } catch {
        // gövde JSON değilse status yeterli
      }
      throw new Error(detail);
    }
  } finally {
    clearTimeout(timer);
  }
}

// Tek bir entegrasyon kanalına düz metin gönderir
export async function sendToIntegration(cfg, text) {
  if (cfg.type === 'whatsapp') {
    if (!cfg.apiUrl || !cfg.apiKey || !cfg.chatId) {
      throw new Error('WhatsApp köprü ayarları eksik (API URL / API Key / Chat ID)');
    }
    return postJson(
      cfg.apiUrl,
      { session: cfg.session || 'default', chatId: cfg.chatId, text },
      { 'X-Api-Key': cfg.apiKey }
    );
  }

  if (cfg.type === 'slack' || cfg.type === 'discord') {
    if (!cfg.webhookUrl) throw new Error('Webhook URL eksik');
    return postJson(cfg.webhookUrl, { [WEBHOOK_PAYLOAD_KEY[cfg.type]]: text });
  }

  throw new Error(`Bilinmeyen entegrasyon tipi: ${cfg.type}`);
}

// Şablonu render edip TÜM aktif kanallara gönderir (uptime/domain tercihlerine saygılı)
export async function notifyTemplate(kind, { isUptime, vars }) {
  const configs = await Integration.find({ enabled: true });
  await Promise.allSettled(
    configs.map(async (cfg) => {
      try {
        if (isUptime && !cfg.notifyUptime) return;
        if (!isUptime && !cfg.notifyDomains) return;
        const text = renderTemplate(
          cfg.templates?.[kind] || DEFAULT_TEMPLATES[kind],
          vars
        );
        await sendToIntegration(cfg, text);
      } catch (err) {
        console.error(`[bildirim] ${cfg.type}: ${err.message}`);
      }
    })
  );
}

// Uptime durum değişim bildirimi: up→down (kesinti) ve down→up (düzeldi)
export async function notifyUptimeChange(monitor, prevStatus) {
  const now = new Date().toLocaleString('tr-TR');

  if (prevStatus === 'up' && monitor.status === 'down') {
    await notifyTemplate('uptimeDown', {
      isUptime: true,
      vars: {
        name: monitor.name,
        url: monitor.url,
        code: monitor.lastStatusCode ? `HTTP ${monitor.lastStatusCode}` : 'Bağlantı kurulamadı',
        reason: monitor.lastStatusCode ? 'Sunucu hata döndürdü' : 'Ağ/DNS hatası',
        time: now,
      },
    });
  } else if (prevStatus === 'down' && monitor.status === 'up') {
    await notifyTemplate('uptimeUp', {
      isUptime: true,
      vars: {
        name: monitor.name,
        url: monitor.url,
        responseTime: monitor.lastResponseTime,
        time: now,
      },
    });
  }
}
