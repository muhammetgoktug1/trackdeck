// Yanıt süresi çizgi grafiği — bağımlılık olmadan saf SVG
export default function Sparkline({ buckets, height = 110, label = 'Yanıt Süresi (ms)' }) {
  const points = buckets.filter((b) => b.avgResponseTime !== null);
  const width = 640;
  const padX = 6;
  const padY = 14;

  if (points.length < 2) {
    return (
      <div className="flex h-[64px] items-center justify-center text-xs text-zinc-600">
        Grafik için yeterli ölçüm yok (en az 2 kova)
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.avgResponseTime));
  const min = Math.min(...points.map((p) => p.avgResponseTime));
  const yMax = Math.max(max, min * 1.4, 10); // alt çizgiye yapışmasın

  // Kovalar zaman ekseninde eşit aralıklı çizilir (boş kovalar da yer kaplar)
  const bucketCount = Math.max(buckets.length, 2);
  const stepX = (width - padX * 2) / (bucketCount - 1);
  const valueIndex = new Map(buckets.map((b, i) => [b.at, i]));

  const coords = points.map((p) => {
    const i = valueIndex.get(p.at) ?? 0;
    const x = padX + i * stepX;
    const y = height - padY - (p.avgResponseTime / yMax) * (height - padY * 2);
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height - padY} L${coords[0].x.toFixed(1)},${height - padY} Z`;

  // Kesinti yaşanan kovalar altta kırmızı çentikle işaretlenir
  const downTicks = buckets
    .map((b, i) => ({ ...b, i }))
    .filter((b) => b.total > 0 && b.up < b.total);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        <span>{label}</span>
        <span className="font-mono normal-case tracking-normal">
          min {min} · ort {Math.round(points.reduce((s, p) => s + p.avgResponseTime, 0) / points.length)} · max {max} ms
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={label}>
        <path d={areaPath} fill="url(#sparkFill)" opacity="0.25" />
        <path d={linePath} fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {downTicks.map((b) => (
          <rect
            key={b.at}
            x={padX + b.i * stepX - 1.5}
            y={height - padY - 5}
            width="3"
            height="5"
            rx="1"
            fill="#f43f5e"
          >
            <title>
              {new Date(b.at).toLocaleString('tr-TR')} · {b.up}/{b.total} başarılı
            </title>
          </rect>
        ))}
        {coords.map((c) => (
          <circle key={c.at} cx={c.x} cy={c.y} r="2" fill="#a5b4fc">
            <title>
              {new Date(c.at).toLocaleString('tr-TR')} · {c.avgResponseTime} ms
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
