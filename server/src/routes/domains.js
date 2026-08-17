import { Router } from 'express';
import Domain from '../models/Domain.js';
import Provider from '../models/Provider.js';
import Monitor from '../models/Monitor.js';
import { resolveRef } from '../lib/refs.js';

const router = Router();

const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const POPULATE = [{ path: 'provider', select: 'name' }];

function parseId(req) {
  const { id } = req.params;
  return /^[0-9a-fA-F]{24}$/.test(id) ? id : null;
}

// Domainleri sayfalı listele
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const [data, total] = await Promise.all([
    Domain.find().sort({ name: 1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE),
    Domain.countDocuments(),
  ]);
  res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

// Yeni domain
router.post('/', async (req, res) => {
  const { name, provider, purchasedAt, expiresAt, notes } = req.body ?? {};

  if (!name || !DOMAIN_RE.test(name.trim())) {
    return res.status(400).json({ message: 'Geçerli bir domain adı girin (örn: ornek.com)' });
  }

  let purchase = null;
  if (purchasedAt) {
    purchase = new Date(purchasedAt);
    if (Number.isNaN(purchase.getTime())) {
      return res.status(400).json({ message: 'Geçerli bir satın alma tarihi girin' });
    }
  }
  let expiry = null;
  if (expiresAt) {
    expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime())) {
      return res.status(400).json({ message: 'Geçerli bir bitiş tarihi girin' });
    }
  }

  const providerRef = await resolveRef(Provider, provider, 'sağlayıcı');
  if (providerRef.error) return res.status(400).json({ message: providerRef.error });

  const domain = await Domain.create({
    name: name.trim().toLowerCase(),
    provider: providerRef.value,
    purchasedAt: purchase,
    expiresAt: expiry,
    notes: (notes ?? '').toString().trim(),
  });
  await domain.populate(POPULATE);
  res.status(201).json(domain);
});

// Domain güncelle
router.patch('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const domain = await Domain.findById(id);
  if (!domain) return res.status(404).json({ message: 'Domain bulunamadı' });

  const { name, provider, purchasedAt, expiresAt, notes } = req.body ?? {};

  if (name !== undefined) {
    if (!name || !DOMAIN_RE.test(name.trim())) {
      return res.status(400).json({ message: 'Geçerli bir domain adı girin (örn: ornek.com)' });
    }
    domain.name = name.trim().toLowerCase();
  }
  if (provider !== undefined) {
    const providerRef = await resolveRef(Provider, provider, 'sağlayıcı');
    if (providerRef.error) return res.status(400).json({ message: providerRef.error });
    domain.provider = providerRef.value;
  }
  if (purchasedAt !== undefined) {
    if (!purchasedAt) {
      domain.purchasedAt = null;
    } else {
      const purchase = new Date(purchasedAt);
      if (Number.isNaN(purchase.getTime())) {
        return res.status(400).json({ message: 'Geçerli bir satın alma tarihi girin' });
      }
      domain.purchasedAt = purchase;
    }
  }
  if (expiresAt !== undefined) {
    if (!expiresAt) {
      domain.expiresAt = null;
    } else {
      const expiry = new Date(expiresAt);
      if (Number.isNaN(expiry.getTime())) {
        return res.status(400).json({ message: 'Geçerli bir bitiş tarihi girin' });
      }
      domain.expiresAt = expiry;
    }
  }
  if (notes !== undefined) domain.notes = notes.toString().trim();

  await domain.save();
  await domain.populate(POPULATE);
  res.json(domain);
});

// Domain sil (bağlı monitörlerden ilişkiyi de kaldır)
router.delete('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const domain = await Domain.findByIdAndDelete(id);
  if (!domain) return res.status(404).json({ message: 'Domain bulunamadı' });

  await Monitor.updateMany({ domain: id }, { $unset: { domain: '' } });
  res.json({ message: 'Domain silindi', id });
});

export default router;
