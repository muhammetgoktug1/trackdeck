import { Router } from 'express';
import ServerModel from '../models/Server.js';
import Provider from '../models/Provider.js';
import Monitor from '../models/Monitor.js';
import { resolveRef } from '../lib/refs.js';

const router = Router();

const POPULATE = [{ path: 'provider', select: 'name' }];

function parseId(req) {
  const { id } = req.params;
  return /^[0-9a-fA-F]{24}$/.test(id) ? id : null;
}

// Sunucuları sayfalı listele
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const [data, total] = await Promise.all([
    ServerModel.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE),
    ServerModel.countDocuments(),
  ]);
  res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

// Yeni sunucu
router.post('/', async (req, res) => {
  const { name, provider, ipAddress, purchasedAt, notes } = req.body ?? {};

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Sunucu adı zorunludur' });
  }

  let purchase = null;
  if (purchasedAt) {
    purchase = new Date(purchasedAt);
    if (Number.isNaN(purchase.getTime())) {
      return res.status(400).json({ message: 'Geçerli bir satın alma tarihi girin' });
    }
  }

  const providerRef = await resolveRef(Provider, provider, 'sağlayıcı');
  if (providerRef.error) return res.status(400).json({ message: providerRef.error });

  const server = await ServerModel.create({
    name: name.trim(),
    provider: providerRef.value,
    ipAddress: (ipAddress ?? '').toString().trim(),
    purchasedAt: purchase,
    notes: (notes ?? '').toString().trim(),
  });
  await server.populate(POPULATE);
  res.status(201).json(server);
});

// Sunucu güncelle
router.patch('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const server = await ServerModel.findById(id);
  if (!server) return res.status(404).json({ message: 'Sunucu bulunamadı' });

  const { name, provider, ipAddress, purchasedAt, notes } = req.body ?? {};

  if (name !== undefined) {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Sunucu adı boş olamaz' });
    }
    server.name = name.trim();
  }
  if (provider !== undefined) {
    const providerRef = await resolveRef(Provider, provider, 'sağlayıcı');
    if (providerRef.error) return res.status(400).json({ message: providerRef.error });
    server.provider = providerRef.value;
  }
  if (purchasedAt !== undefined) {
    if (!purchasedAt) {
      server.purchasedAt = null;
    } else {
      const purchase = new Date(purchasedAt);
      if (Number.isNaN(purchase.getTime())) {
        return res.status(400).json({ message: 'Geçerli bir satın alma tarihi girin' });
      }
      server.purchasedAt = purchase;
    }
  }
  if (ipAddress !== undefined) server.ipAddress = ipAddress.toString().trim();
  if (notes !== undefined) server.notes = notes.toString().trim();

  await server.save();
  await server.populate(POPULATE);
  res.json(server);
});

// Sunucu sil (bağlı monitörlerden ilişkiyi de kaldır)
router.delete('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const server = await ServerModel.findByIdAndDelete(id);
  if (!server) return res.status(404).json({ message: 'Sunucu bulunamadı' });

  await Monitor.updateMany({ server: id }, { $unset: { server: '' } });
  res.json({ message: 'Sunucu silindi', id });
});

export default router;
