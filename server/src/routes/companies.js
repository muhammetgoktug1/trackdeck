import { Router } from 'express';
import Company from '../models/Company.js';
import Customer from '../models/Customer.js';

const router = Router();

function parseId(req) {
  const { id } = req.params;
  return /^[0-9a-fA-F]{24}$/.test(id) ? id : null;
}

// Şirketleri sayfalı listele (müşteri formundaki seçim listesi de buradan beslenir)
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const [data, total] = await Promise.all([
    Company.find().sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    Company.countDocuments(),
  ]);
  res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

router.post('/', async (req, res) => {
  const { name, notes } = req.body ?? {};

  if (!name || !name.toString().trim()) {
    return res.status(400).json({ message: 'Şirket adı boş olamaz' });
  }

  try {
    const company = await Company.create({
      name: name.toString().trim(),
      notes: (notes ?? '').toString().trim(),
    });
    res.status(201).json(company);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Bu isimde bir şirket zaten var' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

router.patch('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const company = await Company.findById(id);
  if (!company) return res.status(404).json({ message: 'Şirket bulunamadı' });

  const { name, notes } = req.body ?? {};

  if (name !== undefined) {
    if (!name.toString().trim()) {
      return res.status(400).json({ message: 'Şirket adı boş olamaz' });
    }
    company.name = name.toString().trim();
  }
  if (notes !== undefined) company.notes = notes.toString().trim();

  try {
    await company.save();
    res.json(company);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Bu isimde bir şirket zaten var' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

// Şirket sil: bağlı müşteriler durur, yalnızca şirket bağlantıları kaldırılır
router.delete('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const company = await Company.findByIdAndDelete(id);
  if (!company) return res.status(404).json({ message: 'Şirket bulunamadı' });

  await Customer.updateMany({ company: id }, { $unset: { company: '' } });
  res.json({ message: 'Şirket silindi', id });
});

export default router;
