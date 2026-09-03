import CheckLog from '../models/CheckLog.js';
import { notifyUptimeChange } from './notify.js';

// Cömert zaman aşımı: monitörün kendi internetindeki geçici yavaşlıklar
// yanlış down ölçümü üretmesin.
const CHECK_TIMEOUT_MS = 60_000;
// Bir kontrolün "down" işaretlenmesi için tüm denemelerin başarısız olması gerekir;
// tek seferlik ağ dalgalanmaları yanlış kesinti bildirimi üretmesin.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3_000;

// Aynı monitörün paralel kontrolünü engeller (manuel buton + scheduler çakışması)
const runningIds = new Set();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tek bir HTTP denemesi yapar; kendi timeout'uyla ölçer ve {ok, statusCode, reason, responseTime} döner.
async function attemptFetch(monitor) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(monitor.url, {
      method: monitor.method,
      redirect: 'follow',
      signal: controller.signal,
    });
    if (response.ok) {
      return { ok: true, statusCode: response.status, reason: '', responseTime: Date.now() - startedAt };
    }
    return {
      ok: false,
      statusCode: response.status,
      reason: `HTTP ${response.status}`,
      responseTime: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      ok: false,
      statusCode: null,
      reason: err.name === 'AbortError' ? `Zaman aşımı (${CHECK_TIMEOUT_MS / 1000} sn)` : err.message,
      responseTime: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Tek bir ölçüm yapar: monitörü günceller ve geçmişe CheckLog yazar.
// Down kararı en fazla MAX_ATTEMPTS denemeyle onaylanır; ilk başarılı deneme "up" sayar.
// Monitör zaten kontrol ediliyorsa mevcut haliyle döner.
export async function runCheck(monitor) {
  const key = monitor.id ?? String(monitor._id);
  if (runningIds.has(key)) return monitor;
  runningIds.add(key);

  const prevStatus = monitor.status;

  let status;
  let statusCode = null;
  let reason = '';
  let responseTime = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await attemptFetch(monitor);
    statusCode = result.statusCode;
    responseTime = result.responseTime;

    if (result.ok) {
      status = 'up';
      reason = '';
      break;
    }

    reason = result.reason;
    status = 'down';
    if (attempt < MAX_ATTEMPTS) await delay(RETRY_DELAY_MS);
  }

  if (status === 'down') {
    reason = `${MAX_ATTEMPTS}/${MAX_ATTEMPTS} deneme başarısız — son hata: ${reason}`;
  }

  monitor.lastResponseTime = responseTime;
  monitor.lastStatusCode = statusCode;
  monitor.status = status;
  monitor.lastCheckedAt = new Date();
  await monitor.save();
  await CheckLog.create({ monitor: monitor._id, status, responseTime, statusCode, reason });

  // Durum değiştiyse (up→down / down→up) bildirim (arka planda)
  if (prevStatus !== status && (prevStatus === 'up' || prevStatus === 'down')) {
    notifyUptimeChange(monitor, prevStatus).catch(() => {});
  }

  runningIds.delete(key);
  return monitor;
}
