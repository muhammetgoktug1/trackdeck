import { Router } from 'express';
import Provider from '../models/Provider.js';
import Domain from '../models/Domain.js';
import ServerModel from '../models/Server.js';

const router = Router();

function parseId(req) {
  const { id } = req.params;
  return /^[0-9a-fA-F]{24}$/.test(id) ? id : null;
}

// Sağlayıcıları sayfalı listele
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const [data, total] = await Promise.all([
    Provider.find().sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    Provider.countDocuments(),
  ]);
  res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

// Yeni sağlayıcı
router.post('/', async (req, res) => {
  const { name, notes } = req.body ?? {};

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Sağlayıcı adı zorunludur' });
  }

  try {
    const provider = await Provider.create({
      name: name.trim(),
      notes: (notes ?? '').toString().trim(),
    });
    res.status(201).json(provider);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Bu sağlayıcı zaten kayıtlı' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

// Sağlayıcıyı güncelle
router.patch('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const provider = await Provider.findById(id);
  if (!provider) return res.status(404).json({ message: 'Sağlayıcı bulunamadı' });

  const { name, notes } = req.body ?? {};

  if (name !== undefined) {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Sağlayıcı adı boş olamaz' });
    }
    provider.name = name.trim();
  }
  if (notes !== undefined) provider.notes = notes.toString().trim();

  try {
    await provider.save();
    res.json(provider);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Bu sağlayıcı zaten kayıtlı' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

// Sağlayıcıyı sil (bağlı domain/sunuculardan ilişkiyi kaldır)
router.delete('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const provider = await Provider.findByIdAndDelete(id);
  if (!provider) return res.status(404).json({ message: 'Sağlayıcı bulunamadı' });

  await Promise.all([
    Domain.updateMany({ provider: id }, { $unset: { provider: '' } }),
    ServerModel.updateMany({ provider: id }, { $unset: { provider: '' } }),
  ]);
  res.json({ message: 'Sağlayıcı silindi', id });
});

export default router;
