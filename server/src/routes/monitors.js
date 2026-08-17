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

// Tüm monitörleri sayfalı listele
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const [data, total] = await Promise.all([
    Monitor.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE),
    Monitor.countDocuments(),
  ]);

  res.json({
    data,
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

export default router;
