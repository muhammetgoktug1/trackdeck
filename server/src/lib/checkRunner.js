import CheckLog from '../models/CheckLog.js';
import { notifyUptimeChange } from './notify.js';

const CHECK_TIMEOUT_MS = 10_000;

// Aynı monitörün paralel kontrolünü engeller (manuel buton + scheduler çakışması)
const runningIds = new Set();

// Tek bir ölçüm yapar: monitörü günceller ve geçmişe CheckLog yazar.
// Monitör zaten kontrol ediliyorsa mevcut haliyle döner (10 sn_timeout içinde biter).
export async function runCheck(monitor) {
  const key = monitor.id ?? String(monitor._id);
  if (runningIds.has(key)) return monitor;
  runningIds.add(key);

  const prevStatus = monitor.status;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  const startedAt = Date.now();

  let status;
  let statusCode = null;
  let reason = '';

  try {
    const response = await fetch(monitor.url, {
      method: monitor.method,
      redirect: 'follow',
      signal: controller.signal,
    });
    statusCode = response.status;
    status = response.ok ? 'up' : 'down';
    if (!response.ok) reason = `HTTP ${response.status}`;
  } catch (err) {
    status = 'down';
    reason = err.name === 'AbortError' ? `Zaman aşımı (${CHECK_TIMEOUT_MS / 1000} sn)` : err.message;
  }

  const responseTime = Date.now() - startedAt;
  clearTimeout(timer);

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
