export function formatInterval(seconds) {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds} sn`;
  if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    return `${m} dk`;
  }
  if (seconds < 86400) {
    const h = Math.round(seconds / 3600);
    return `${h} sa`;
  }
  const d = Math.round(seconds / 86400);
  return `${d} gün`;
}

// Form'daki saniye değerinin okunabilir karşılığı (≈ 5 dakika, ≈ 1,5 saat)
export function intervalHint(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return '';
  const fmt = (v) => String(v).replace('.', ',');
  if (n < 60) return '≈ 1 dakikadan kısa';
  if (n < 3600) {
    const m = n / 60;
    return Number.isInteger(m) ? `≈ ${m} dakika` : `≈ ${fmt(+(m.toFixed(1)))} dakika`;
  }
  if (n < 86400) {
    const h = n / 3600;
    return Number.isInteger(h) ? `≈ ${h} saat` : `≈ ${fmt(+(h.toFixed(1)))} saat`;
  }
  const d = n / 86400;
  return Number.isInteger(d) ? `≈ ${d} gün` : `≈ ${fmt(+(d.toFixed(1)))} gün`;
}

export function formatResponseTime(ms) {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} sn`;
}

export function responseTimeClass(ms) {
  if (ms === null || ms === undefined) return 'text-zinc-500';
  if (ms < 300) return 'text-emerald-400';
  if (ms < 1000) return 'text-amber-400';
  return 'text-rose-400';
}

export function timeAgo(date) {
  if (!date) return 'hiç';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 15) return 'az önce';
  if (seconds < 60) return `${seconds} sn önce`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function formatDateTR(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTimeTR(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function daysUntil(date) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

// Domain bitiş rozeti için sınıf: geçti / yaklaşıyor / normal
export function expiryClass(date) {
  const days = daysUntil(date);
  if (days === null) return { text: '—', extra: '', chip: null };
  if (days < 0) return { text: 'Süresi geçti', extra: '', chip: 'text-rose-400 bg-rose-500/10 ring-rose-500/20' };
  const extra = `${days} gün kaldı`;
  if (days < 30) return { text: extra, extra, chip: 'text-amber-400 bg-amber-500/10 ring-amber-500/20' };
  return { text: extra, extra, chip: 'text-zinc-400 bg-zinc-800/70 ring-zinc-700/60' };
}

// Mesaj şablonundaki {degisken} yer tutucularını değerlerle değiştirir
export function renderTemplate(text, vars) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const STATUS_META = {
  up: {
    label: 'Çevrimiçi',
    dot: 'bg-emerald-400',
    pulse: 'bg-emerald-400/60',
    text: 'text-emerald-400',
    chip: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  },
  down: {
    label: 'Erişilemiyor',
    dot: 'bg-rose-500',
    pulse: 'bg-rose-500/60',
    text: 'text-rose-400',
    chip: 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
  },
  paused: {
    label: 'Duraklatıldı',
    dot: 'bg-zinc-500',
    pulse: '',
    text: 'text-zinc-400',
    chip: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
  },
  pending: {
    label: 'Bekliyor',
    dot: 'bg-amber-400',
    pulse: 'bg-amber-400/60',
    text: 'text-amber-400',
    chip: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  },
};
