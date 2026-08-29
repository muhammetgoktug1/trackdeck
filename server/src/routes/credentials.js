import { Router } from 'express';
import Credential from '../models/Credential.js';
import CredentialCategory from '../models/CredentialCategory.js';
import { resolveRef, ID_RE } from '../lib/refs.js';
import { encrypt, decrypt } from '../lib/crypto.js';

const router = Router();

function parseId(req) {
  const { id } = req.params;
  return /^[0-9a-fA-F]{24}$/.test(id) ? id : null;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Şifreleri sayfalı listele (şifre asla dönmez) + arama + kategori filtresi
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const query = {};

  if (req.query.category && ID_RE.test(req.query.category)) {
    query.category = req.query.category;
  }
  if (req.query.q) {
    const escaped = req.query.q.toString().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escaped) {
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { username: { $regex: escaped, $options: 'i' } },
      ];
    }
  }

  const [data, total] = await Promise.all([
    Credential.find(query)
      .sort({ title: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category', 'name color'),
    Credential.countDocuments(query),
  ]);
  res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

// Yeni şifre kaydı
router.post('/', async (req, res) => {
  const { title, category, username, password, url, notes } = req.body ?? {};

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Başlık zorunludur' });
  }
  if (url && !isValidHttpUrl(url)) {
    return res.status(400).json({ message: 'URL geçerli bir http(s) adres olmalı' });
  }

  const categoryRef = await resolveRef(CredentialCategory, category, 'kategori');
  if (categoryRef.error) return res.status(400).json({ message: categoryRef.error });

  try {
    const credential = await Credential.create({
      title: title.trim(),
      category: categoryRef.value,
      username: (username ?? '').toString().trim(),
      passwordEnc: password ? encrypt(password) : '',
      url: (url ?? '').toString().trim(),
      notes: (notes ?? '').toString().trim(),
    });
    await credential.populate('category', 'name color');
    res.status(201).json(credential);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

// Kaydı güncelle (boş şifre gelirse mevcut şifre korunur)
router.patch('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const credential = await Credential.findById(id);
  if (!credential) return res.status(404).json({ message: 'Kayıt bulunamadı' });

  const { title, category, username, password, url, notes } = req.body ?? {};

  if (title !== undefined) {
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Başlık boş olamaz' });
    }
    credential.title = title.trim();
  }
  if (category !== undefined) {
    const categoryRef = await resolveRef(CredentialCategory, category, 'kategori');
    if (categoryRef.error) return res.status(400).json({ message: categoryRef.error });
    credential.category = categoryRef.value;
  }
  if (username !== undefined) credential.username = username.toString().trim();
  if (password !== undefined && password !== null && password !== '') {
    credential.passwordEnc = encrypt(password);
  }
  if (url !== undefined) {
    const v = url.toString().trim();
    if (v && !isValidHttpUrl(v)) {
      return res.status(400).json({ message: 'URL geçerli bir http(s) adres olmalı' });
    }
    credential.url = v;
  }
  if (notes !== undefined) credential.notes = notes.toString().trim();

  try {
    await credential.save();
    await credential.populate('category', 'name color');
    res.json(credential);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

// Tek şifreyi çöz ve döner (kullanıcı "göster" dediğinde çağrılır)
router.post('/:id/reveal', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const credential = await Credential.findById(id);
  if (!credential) return res.status(404).json({ message: 'Kayıt bulunamadı' });
  if (!credential.passwordEnc) {
    return res.status(404).json({ message: 'Bu kayıtta şifre yok' });
  }

  try {
    res.json({ password: decrypt(credential.passwordEnc) });
  } catch {
    res.status(500).json({ message: 'Şifre çözülemedi (MASTER_KEY değişmiş olabilir)' });
  }
});

// Kaydı sil
router.delete('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const credential = await Credential.findByIdAndDelete(id);
  if (!credential) return res.status(404).json({ message: 'Kayıt bulunamadı' });
  res.json({ message: 'Kayıt silindi', id });
});

export default router;
