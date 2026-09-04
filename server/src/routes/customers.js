import { Router } from 'express';
import Customer from '../models/Customer.js';
import Company from '../models/Company.js';
import { resolveRef } from '../lib/refs.js';

const router = Router();

const POPULATE = [{ path: 'company', select: 'name' }];

const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseId(req) {
  const { id } = req.params;
  return /^[0-9a-fA-F]{24}$/.test(id) ? id : null;
}

// ad/soyadı/telefon/mail alanlarını tek tek doğrular; hatalıysa mesaj döner
function validateFields({ ad, soyadi, mail }) {
  if (ad !== undefined && !String(ad).trim()) return 'Ad boş olamaz';
  if (soyadi !== undefined && !String(soyadi).trim()) return 'Soyadı boş olamaz';
  if (mail !== undefined && mail !== '' && !MAIL_RE.test(String(mail).trim())) {
    return 'Geçerli bir mail adresi gir';
  }
  return null;
}

// Liste: sayfalama + ad/soyadı/telefon/mail üzerinden arama
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const query = {};
  if (req.query.q) {
    const escaped = req.query.q.toString().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escaped) {
      query.$or = [
        { ad: { $regex: escaped, $options: 'i' } },
        { soyadi: { $regex: escaped, $options: 'i' } },
        { telefon: { $regex: escaped, $options: 'i' } },
        { mail: { $regex: escaped, $options: 'i' } },
      ];
    }
  }

  const [data, total] = await Promise.all([
    // Türkçe locale: ç, ğ, ı, ö, ş, ü harfleri alfabetik doğru sırada dursun
    Customer.find(query)
      .collation({ locale: 'tr', strength: 1 })
      .sort({ soyadi: 1, ad: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE),
    Customer.countDocuments(query),
  ]);
  res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

router.post('/', async (req, res) => {
  const { ad = '', soyadi = '', telefon = '', mail = '', company = null } = req.body ?? {};

  const invalid = validateFields({ ad, soyadi, mail });
  if (invalid) return res.status(400).json({ message: invalid });

  // şirket yalnızca tanımlı listeden seçilebilir; boş/null = şirketsiz
  const companyRef = await resolveRef(Company, company, 'şirket');
  if (companyRef.error) return res.status(400).json({ message: companyRef.error });

  try {
    const customer = await Customer.create({
      ad: ad.trim(),
      soyadi: soyadi.trim(),
      telefon: telefon.trim(),
      mail: mail.trim(),
      company: companyRef.value,
    });
    await customer.populate(POPULATE);
    res.status(201).json(customer);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

router.patch('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const customer = await Customer.findById(id);
  if (!customer) return res.status(404).json({ message: 'Müşteri bulunamadı' });

  const { ad, soyadi, telefon, mail, company } = req.body ?? {};
  const invalid = validateFields({ ad, soyadi, mail });
  if (invalid) return res.status(400).json({ message: invalid });

  if (company !== undefined) {
    const companyRef = await resolveRef(Company, company, 'şirket');
    if (companyRef.error) return res.status(400).json({ message: companyRef.error });
    customer.company = companyRef.value;
  }

  try {
    if (ad !== undefined) customer.ad = ad.trim();
    if (soyadi !== undefined) customer.soyadi = soyadi.trim();
    if (telefon !== undefined) customer.telefon = telefon.trim();
    if (mail !== undefined) customer.mail = mail.trim();
    await customer.save();
    await customer.populate(POPULATE);
    res.json(customer);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseId(req);
  if (!id) return res.status(400).json({ message: 'Geçersiz kimlik' });

  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) return res.status(404).json({ message: 'Müşteri bulunamadı' });
  res.json({ message: 'Müşteri silindi', id });
});

export default router;
