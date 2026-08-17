import Monitor from '../models/Monitor.js';
import { runCheck } from './checkRunner.js';

// Tarama sıklığı: minimum interval 10 sn olduğu için her 15 sn'de bir
// "süresi gelmiş" monitörler taranır. Tarama ucuzdur (tek sorgu + JS filtresi).
const TICK_MS = 15_000;

function isDue(monitor, now) {
  if (!monitor.enabled || monitor.status === 'paused') return false;
  if (!monitor.lastCheckedAt) return true; // hiç kontrol edilmemiş
  return now - monitor.lastCheckedAt.getTime() >= monitor.interval * 1000;
}

async function sweep() {
  const now = Date.now();
  const due = (await Monitor.find({ enabled: true })).filter((m) => isDue(m, now));
  if (due.length === 0) return;

  await Promise.allSettled(due.map((m) => runCheck(m)));
  console.log(
    `[tarama] ${due.length} monitör kontrol edildi: ` +
      due.map((m) => `${m.name}=${m.status}(${m.lastResponseTime}ms)`).join(', ')
  );
}

export function startMonitorScheduler() {
  // açılıştan kısa süre sonra ilk tarama (süresi geçmiş monitörler hemen toplanır),
  // sonra sabit aralıklarla
  setTimeout(() => {
    sweep().catch((err) => console.error('[tarama] uptime taraması:', err.message));
  }, 5_000);
  setInterval(() => {
    sweep().catch((err) => console.error('[tarama] uptime taraması:', err.message));
  }, TICK_MS);
  console.log(`[tarama] uptime tarayıcısı ${TICK_MS / 1000} sn'de bir süresi gelen monitörleri kontrol edecek`);
}
