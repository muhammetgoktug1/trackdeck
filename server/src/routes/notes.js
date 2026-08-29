import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import Note from '../models/Note.js';
import NoteCategory from '../models/NoteCategory.js';
import { resolveRef, ID_RE } from '../lib/refs.js';

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // diskte rastgele isim; orijinal isim yalnızca metadata olarak saklanır
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

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

// Bağlantı listesini doğrula ve temizle; hatalıysa hata mesajı döner
function parseLinks(value) {
  if (value === undefined) return { skip: true };
  if (value === null) return { value: [] };
  if (!Array.isArray(value)) return { error: 'Bağlantı listesi geçersiz' };

  const links = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const url = String(item.url ?? '').trim();
    if (!url) continue; // boş satırlar sessizce atılır
    if (!isValidHttpUrl(url)) {
      return { error: 'Bağlantı adresi geçerli bir http(s) olmalı' };
    }
    links.push({ url, label: String(item.label ?? '').trim() });
  }
  return { value: links };
}

function deleteAttachmentFiles(note) {
  for (const att of note.attachments ?? []) {
    const filePath = path.join(UPLOAD_DIR, att.storedName);
    fs.promises.unlink(filePath).catch(() => {});
  }
}

// Notları sayfalı listele (sabitlenenler üstte, sonra en yeni; opsiyonel kategori filtresi)
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const query = {};
  if (req.query.category && ID_RE.test(req.query.category)) {
    query.category = req.query.category;
  }

  const [data, total] = await Promise.all([
    Note.find(query)
      .sort({ pinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('category', 'name color'),
    Note.countDocuments(query),
  ]);
  res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

// Yeni not
router.post('/', async (req, res) => {
  const { title, content, pinned, links, category } = req.body ?? {};

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Not başlığı zorunludur' });
  }

  const linksResult = parseLinks(links);
  if (linksResult.error) return res.status(400).json({ message: linksResult.error });

  const categoryRef = await resolveRef(NoteCategory, category, 'kategori');
  if (categoryRef.error) return res.status(400).json({ message: categoryRef.error });

  try {
    const note = await Note.create({
      title: title.trim(),
      content: (content ?? '').toString().trim(),
      pinned: Boolean(pinned),
      category: categoryRef.value,
      links: linksResult.value ?? [],
    });
    await note.populate('category', 'name color');
    res.status(201).json(note);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

// Not güncelle
router.patch('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const note = await Note.findById(id);
  if (!note) return res.status(404).json({ message: 'Not bulunamadı' });

  const { title, content, pinned, links, category } = req.body ?? {};

  if (title !== undefined) {
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Not başlığı boş olamaz' });
    }
    note.title = title.trim();
  }
  if (category !== undefined) {
    // null/'' kategoriyi temizler
    const categoryRef = await resolveRef(NoteCategory, category, 'kategori');
    if (categoryRef.error) return res.status(400).json({ message: categoryRef.error });
    note.category = categoryRef.value;
  }
  if (content !== undefined) note.content = content.toString().trim();
  if (pinned !== undefined) note.pinned = Boolean(pinned);

  if (links !== undefined) {
    const linksResult = parseLinks(links);
    if (linksResult.error) return res.status(400).json({ message: linksResult.error });
    note.links = linksResult.value ?? [];
  }

  try {
    await note.save();
    await note.populate('category', 'name color');
    res.json(note);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

// Nota dosya ekle (pdf, docx, görsel vb.)
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const note = await Note.findById(id);
  if (!note) return res.status(404).json({ message: 'Not bulunamadı' });

  if (!req.file) {
    return res.status(400).json({ message: 'Dosya bulunamadı' });
  }

  note.attachments.push({
    fileName: path.basename(req.file.originalname || 'dosya'),
    storedName: req.file.filename,
    mimeType: req.file.mimetype || '',
    size: req.file.size,
  });
  await note.save();
  res.status(201).json(note);
});

// Nottan dosya sil
router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const note = await Note.findById(id);
  if (!note) return res.status(404).json({ message: 'Not bulunamadı' });

  const att = note.attachments.id(req.params.attachmentId);
  if (!att) return res.status(404).json({ message: 'Ek bulunamadı' });

  const storedName = att.storedName;
  att.deleteOne();
  await note.save();

  fs.promises.unlink(path.join(UPLOAD_DIR, storedName)).catch(() => {});
  res.json({ message: 'Ek silindi', id: req.params.attachmentId });
});

// Not sil (ek dosyaları diskten de temizlenir)
router.delete('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const note = await Note.findByIdAndDelete(id);
  if (!note) return res.status(404).json({ message: 'Not bulunamadı' });

  deleteAttachmentFiles(note);
  res.json({ message: 'Not silindi', id });
});

export default router;
