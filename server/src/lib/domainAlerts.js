import Integration from '../models/Integration.js';
import Domain from '../models/Domain.js';
import { sendToIntegration } from './notify.js';
import { DEFAULT_TEMPLATES, renderTemplate } from './messageTemplates.js';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // saatlik tarama

// Bu süreçte bildirilmiş eşikler: `${integrationId}:${domainId}:${threshold}`
// Not: süreç yeniden başlarsa aynı gün tekrar bildirim atabilir (lokal kullanımda kabul edilebilir)
const notified = new Set();

async function safeSend(cfg, kind, vars) {
  const text = renderTemplate(cfg.templates?.[kind] || DEFAULT_TEMPLATES[kind], vars);
  try {
    await sendToIntegration(cfg, text);
  } catch (err) {
    console.error(`[bildirim] ${cfg.type}: ${err.message}`);
  }
}

async function scanDomains() {
  // Her entegrasyon kendi eşikleriyle tarar
  const configs = await Integration.find({ enabled: true, notifyDomains: true });
  const active = configs.filter((c) => c.domainThresholds?.length > 0);
  if (active.length === 0) return;

  const domains = await Domain.find({ expiresAt: { $ne: null } });
  const now = new Date();

  for (const cfg of active) {
    const thresholds = [...cfg.domainThresholds].sort((a, b) => b - a); // büyükten küçüğe

    for (const domain of domains) {
      const days = Math.ceil((domain.expiresAt.getTime() - now.getTime()) / 86_400_000);
      const stamp = new Date().toLocaleString('tr-TR');
      const expiresAt = domain.expiresAt.toLocaleDateString('tr-TR');

      if (days < 0) {
        const key = `${cfg.id}:${domain.id}:expired`;
        if (notified.has(key)) continue;
        notified.add(key);
        await safeSend(cfg, 'domainExpired', { name: domain.name, expiresAt, time: stamp });
        continue;
      }

      // geçilen en yüksek eşik henüz bildirilmediyse onu bildir; alt eşikler günü gelince ayrıca bildirilir
      for (const t of thresholds) {
        if (days > t) break;
        const key = `${cfg.id}:${domain.id}:${t}`;
        if (notified.has(key)) break;
        notified.add(key);
        await safeSend(cfg, 'domainExpiry', {
          name: domain.name,
          days: t,
          expiresAt,
          time: stamp,
        });
        break;
      }
    }
  }
}

export function startDomainAlertScheduler() {
  // açılıştan kısa bir süre sonra ilk tarama, sonra saatlik
  setTimeout(() => {
    scanDomains().catch((err) => console.error('[bildirim] domain taraması:', err.message));
  }, 15_000);
  setInterval(() => {
    scanDomains().catch((err) => console.error('[bildirim] domain taraması:', err.message));
  }, CHECK_INTERVAL_MS);
  console.log('[bildirim] domain bitiş tarayıcısı saatlik çalışacak');
}
