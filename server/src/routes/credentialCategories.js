import { Router } from 'express';
import CredentialCategory from '../models/CredentialCategory.js';
import Credential from '../models/Credential.js';

const router = Router();

// Hazır palet dışı değerlere karşı sunucu tarafı güvence
const PALETTE = new Set(['#64748b', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7']);

function parseId(req) {
  const { id } = req.params;
  return /^[0-9a-fA-F]{24}$/.test(id) ? id : null;
}

// Kategorileri sayfalı listele
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const [data, total] = await Promise.all([
    CredentialCategory.find().sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    CredentialCategory.countDocuments(),
  ]);
  res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

// Yeni kategori
router.post('/', async (req, res) => {
  const { name, color } = req.body ?? {};

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Kategori adı zorunludur' });
  }

  try {
    const category = await CredentialCategory.create({
      name: name.trim(),
      color: color && PALETTE.has(color) ? color : '#64748b',
    });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Bu kategori zaten kayıtlı' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

// Kategoriyi güncelle
router.patch('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const category = await CredentialCategory.findById(id);
  if (!category) return res.status(404).json({ message: 'Kategori bulunamadı' });

  const { name, color } = req.body ?? {};

  if (name !== undefined) {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Kategori adı boş olamaz' });
    }
    category.name = name.trim();
  }
  if (color !== undefined && PALETTE.has(color)) category.color = color;

  try {
    await category.save();
    res.json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Bu kategori zaten kayıtlı' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

// Kategoriyi sil (bağlı şifre kayıtlarından ilişkiyi kaldır)
router.delete('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const category = await CredentialCategory.findByIdAndDelete(id);
  if (!category) return res.status(404).json({ message: 'Kategori bulunamadı' });

  await Credential.updateMany({ category: id }, { $unset: { category: '' } });
  res.json({ message: 'Kategori silindi', id });
});

export default router;
