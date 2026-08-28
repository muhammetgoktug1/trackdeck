import { Router } from 'express';
import mongoose from 'mongoose';
import Monitor from '../models/Monitor.js';
import Domain from '../models/Domain.js';
import ServerModel from '../models/Server.js';
import CheckLog from '../models/CheckLog.js';
import { resolveRef } from '../lib/refs.js';
import { runCheck } from '../lib/checkRunner.js';

const router = Router();

const POPULATE = [
  { path: 'domain', select: 'name' },
  { path: 'server', select: 'name' },
];

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseId(req) {
  const { id } = req.params;
  return /^[0-9a-fA-F]{24}$/.test(id) ? id : null;
}

function parseValidationError(err) {
  return Object.values(err.errors)
    .map((e) => e.message)
    .join(', ');
}

// Tüm monitörleri sayfalı listele (her satırda son 7 gün uptime %)
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const [data, total] = await Promise.all([
    Monitor.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE),
    Monitor.countDocuments(),
  ]);

  // Sayfadaki monitörler için tek aggregate ile 7 günlük up/toplam
  const ids = data.map((m) => m._id);
  let uptimeByid = new Map();
  if (ids.length > 0) {
    const since7d = new Date(Date.now() - 7 * 86_400_000);
    const rows = await CheckLog.aggregate([
      { $match: { monitor: { $in: ids }, checkedAt: { $gte: since7d } } },
      {
        $group: {
          _id: '$monitor',
          up: { $sum: { $cond: [{ $eq: ['$status', 'up'] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]);
    uptimeByid = new Map(rows.map((r) => [String(r._id), r]));
  }

  res.json({
    data: data.map((m) => {
      const row = uptimeByid.get(String(m._id));
      const up = row?.up ?? 0;
      const checked = row?.total ?? 0;
      return {
        ...m.toJSON(),
        uptime7d: {
          up,
          total: checked,
          percent: checked === 0 ? null : Math.round((up / checked) * 1000) / 10,
        },
      };
    }),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

// Yeni monitör oluştur
router.post('/', async (req, res) => {
  const { name, url, method, interval, enabled, notes, domain, server } = req.body ?? {};

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Monitör adı zorunludur' });
  }
  if (!url || !isValidHttpUrl(url)) {
    return res.status(400).json({ message: 'Geçerli bir http(s) URL girin' });
  }

  const domainRef = await resolveRef(Domain, domain, 'domain');
  if (domainRef.error) return res.status(400).json({ message: domainRef.error });
  const serverRef = await resolveRef(ServerModel, server, 'sunucu');
  if (serverRef.error) return res.status(400).json({ message: serverRef.error });

  try {
    const monitor = await Monitor.create({
      name: name.trim(),
      url: url.trim(),
      method: method === 'HEAD' ? 'HEAD' : 'GET',
      interval: Number(interval) || 60,
      enabled: enabled !== false,
      notes: (notes ?? '').toString().trim(),
      domain: domainRef.value,
      server: serverRef.value,
      status: enabled === false ? 'paused' : 'pending',
    });
    await monitor.populate(POPULATE);

    // Aktif monitörün ilk taraması cevabı bekletmeden arka planda başlar
    if (monitor.enabled) {
      runCheck(monitor).catch(() => {});
    }

    res.status(201).json(monitor);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: parseValidationError(err) });
    }
    throw err;
  }
});

// Tek monitör getir
router.get('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const monitor = await Monitor.findById(id).populate(POPULATE);
  if (!monitor) return res.status(404).json({ message: 'Monitör bulunamadı' });
  res.json(monitor);
});

// Monitörün kontrol geçmişi (sayfalı) + özet istatistik
router.get('/:id/checks', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const monitor = await Monitor.findById(id).select('_id');
  if (!monitor) return res.status(404).json({ message: 'Monitör bulunamadı' });

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const query = { monitor: monitor._id };

  const [data, total, agg] = await Promise.all([
    CheckLog.find(query).sort({ checkedAt: -1 }).skip((page - 1) * limit).limit(limit),
    CheckLog.countDocuments(query),
    CheckLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          upCount: { $sum: { $cond: [{ $eq: ['$status', 'up'] }, 1, 0] } },
          avgResponseTime: {
            $avg: { $cond: [{ $eq: ['$status', 'up'] }, '$responseTime', null] },
          },
          minResponseTime: { $min: { $cond: [{ $eq: ['$status', 'up'] }, '$responseTime', null] } },
          maxResponseTime: { $max: { $cond: [{ $eq: ['$status', 'up'] }, '$responseTime', null] } },
        },
      },
    ]),
  ]);

  const stats = agg[0] ?? { upCount: 0, avgResponseTime: null, minResponseTime: null, maxResponseTime: null };
  const round = (v) => (v === null || v === undefined ? null : Math.round(v));

  res.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      totalChecks: total,
      upCount: stats.upCount,
      uptimePercent: total === 0 ? 0 : Math.round((stats.upCount / total) * 1000) / 10,
      avgResponseTime: round(stats.avgResponseTime),
      minResponseTime: round(stats.minResponseTime),
      maxResponseTime: round(stats.maxResponseTime),
    },
  });
});

// Monitörü güncelle
router.patch('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const monitor = await Monitor.findById(id);
  if (!monitor) return res.status(404).json({ message: 'Monitör bulunamadı' });

  const { name, url, method, interval, enabled, notes, domain, server } = req.body ?? {};

  if (name !== undefined) {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Monitör adı boş olamaz' });
    }
    monitor.name = name.trim();
  }
  if (url !== undefined) {
    if (!isValidHttpUrl(url)) {
      return res.status(400).json({ message: 'Geçerli bir http(s) URL girin' });
    }
    monitor.url = url.trim();
  }
  if (method !== undefined) {
    if (!['GET', 'HEAD'].includes(method)) {
      return res.status(400).json({ message: 'Yöntem GET veya HEAD olabilir' });
    }
    monitor.method = method;
  }
  if (interval !== undefined) {
    monitor.interval = Number(interval);
  }
  if (enabled !== undefined) {
    monitor.enabled = Boolean(enabled);
    // Durumu aktifliğe göre senkronize et; pasifleşen monitör ölçüm üretmez
    monitor.status = monitor.enabled ? 'pending' : 'paused';
  }
  if (notes !== undefined) {
    monitor.notes = (notes ?? '').toString().trim();
  }
  if (domain !== undefined) {
    const domainRef = await resolveRef(Domain, domain, 'domain');
    if (domainRef.error) return res.status(400).json({ message: domainRef.error });
    monitor.domain = domainRef.value;
  }
  if (server !== undefined) {
    const serverRef = await resolveRef(ServerModel, server, 'sunucu');
    if (serverRef.error) return res.status(400).json({ message: serverRef.error });
    monitor.server = serverRef.value;
  }

  try {
    await monitor.save();
    await monitor.populate(POPULATE);
    res.json(monitor);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: parseValidationError(err) });
    }
    throw err;
  }
});

// Monitörü sil (geçmiş kayıtları da temizlenir)
router.delete('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const monitor = await Monitor.findByIdAndDelete(id);
  if (!monitor) return res.status(404).json({ message: 'Monitör bulunamadı' });

  await CheckLog.deleteMany({ monitor: id });
  res.json({ message: 'Monitör silindi', id });
});

// Monitörü şimdi kontrol et (anlık uptime ölçümü)
router.post('/:id/check', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const monitor = await Monitor.findById(id);
  if (!monitor) return res.status(404).json({ message: 'Monitör bulunamadı' });

  await runCheck(monitor);
  await monitor.populate(POPULATE);
  res.json(monitor);
});

// Yanıt süresi grafiği ve uptime şeridi için zaman kovalı seri
// (24 saate kadar 15 dk, 7 güne kadar 1 saat, sonrasında 6 saat kovalar)
router.get('/:id/timeseries', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const monitor = await Monitor.findById(id).select('_id');
  if (!monitor) return res.status(404).json({ message: 'Monitör bulunamadı' });

  const hours = Math.min(720, Math.max(1, parseInt(req.query.hours, 10) || 24));
  const bucketMs = hours <= 24 ? 15 * 60_000 : hours <= 168 ? 3_600_000 : 6 * 3_600_000;
  const since = new Date(Date.now() - hours * 3_600_000);

  const buckets = await CheckLog.aggregate([
    { $match: { monitor: monitor._id, checkedAt: { $gte: since } } },
    {
      $group: {
        _id: {
          $toDate: {
            $subtract: [{ $toLong: '$checkedAt' }, { $mod: [{ $toLong: '$checkedAt' }, bucketMs] }],
          },
        },
        up: { $sum: { $cond: [{ $eq: ['$status', 'up'] }, 1, 0] } },
        total: { $sum: 1 },
        avgResponseTime: { $avg: { $cond: [{ $eq: ['$status', 'up'] }, '$responseTime', null] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    hours,
    bucketMs,
    since: since.toISOString(),
    buckets: buckets.map((b) => ({
      at: b._id.toISOString(),
      up: b.up,
      total: b.total,
      avgResponseTime: b.avgResponseTime === null || Number.isNaN(b.avgResponseTime)
        ? null
        : Math.round(b.avgResponseTime),
    })),
  });
});

// Kesinti (incident) çizelgesi: ardışık down blokları başlangıç/bitiş/süre
// olarak döner; henüz düzelmemişse ongoing=true kalır
router.get('/:id/incidents', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const monitor = await Monitor.findById(id).select('_id');
  if (!monitor) return res.status(404).json({ message: 'Monitör bulunamadı' });

  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
  const since = new Date(Date.now() - days * 86_400_000);

  const logs = await CheckLog.find({ monitor: monitor._id, checkedAt: { $gte: since } })
    .select('status checkedAt -_id')
    .sort({ checkedAt: 1 })
    .limit(50_000);

  const incidents = [];
  let current = null;
  let upCount = 0;

  for (const log of logs) {
    if (log.status === 'down') {
      if (!current) {
        current = { startedAt: log.checkedAt, endedAt: null };
      }
      current.lastDownAt = log.checkedAt;
    } else {
      upCount++;
      if (current) {
        current.endedAt = log.checkedAt;
        incidents.push(current);
        current = null;
      }
    }
  }
  // hâlâ down durumundaysa devam eden kesinti olarak kapat
  if (current) incidents.push(current);

  const totalDownMs = incidents.reduce(
    (sum, i) =>
      sum +
      ((i.endedAt ?? i.lastDownAt ?? i.startedAt).getTime() - i.startedAt.getTime()),
    0
  );

  res.json({
    days,
    incidents: incidents
      .map(({ startedAt, endedAt, lastDownAt }) => ({
        startedAt,
        endedAt,
        // süre: düzelme anına kadar; hâlâ down'sa son down ölçümüne kadar
        durationMs:
          (endedAt ?? lastDownAt ?? startedAt).getTime() - startedAt.getTime(),
        ongoing: !endedAt,
      }))
      .sort((a, b) => b.startedAt - a.startedAt),
    summary: {
      count: incidents.length,
      totalDownMs,
      checksTotal: logs.length,
      checksUp: upCount,
      uptimePercent:
        logs.length === 0 ? null : Math.round((upCount / logs.length) * 1000) / 10,
    },
  });
});

export default router;
