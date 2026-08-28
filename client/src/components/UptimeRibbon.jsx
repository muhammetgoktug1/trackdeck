// Status sayfası stili uptime şeridi: her kova bir çubuk
// (tamamen up → yeşil, tamamen down → kırmızı, karışık → amber)
export default function UptimeRibbon({ buckets, label = 'Uptime Şeridi' }) {
  if (!buckets || buckets.length === 0) {
    return (
      <div className="flex h-8 items-center text-xs text-zinc-600">
        Şerit için henüz ölçüm yok
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        {label}
      </div>
      <div className="flex h-8 items-stretch gap-[2px] overflow-hidden rounded-lg bg-zinc-800/40 p-1 ring-1 ring-zinc-800">
        {buckets.map((b) => {
          const ratio = b.total === 0 ? null : b.up / b.total;
          const cls =
            ratio === null
              ? 'bg-zinc-700/50'
              : ratio === 1
                ? 'bg-emerald-500/80'
                : ratio === 0
                  ? 'bg-rose-500/80'
                  : 'bg-amber-500/80';
          const title =
            b.total === 0
              ? 'Ölçüm yok'
              : `${new Date(b.at).toLocaleString('tr-TR')} · ${b.up}/${b.total} başarılı${
                  b.avgResponseTime !== null ? ` · ort ${b.avgResponseTime} ms` : ''
                }`;
          return (
            <span
              key={b.at}
              className={`min-w-[3px] flex-1 rounded-sm transition-transform hover:scale-y-110 ${cls}`}
              title={title}
            />
          );
        })}
      </div>
    </div>
  );
}
