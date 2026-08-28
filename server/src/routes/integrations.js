import { Router } from 'express';
import Integration from '../models/Integration.js';
import { sendToIntegration } from '../lib/notify.js';
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS } from '../lib/messageTemplates.js';

const router = Router();

const TYPE_RE = /^(whatsapp|slack|discord)$/;
// webhook tabanlı kanallar: bağlantı için tek alan yeterli
const WEBHOOK_TYPES = new Set(['slack', 'discord']);

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseThresholds(value) {
  if (!Array.isArray(value)) return null;
  const nums = value
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v >= 1 && v <= 365);
  return [...new Set(nums)].sort((a, b) => b - a);
}

async function getOrCreate(type) {
  let doc = await Integration.findOne({ type });
  if (!doc) doc = await Integration.create({ type });
  return doc;
}

function validateRequiredFields(doc) {
  if (!doc.enabled) return null;
  if (WEBHOOK_TYPES.has(doc.type)) {
    if (!doc.webhookUrl) {
      return 'Entegrasyonu aktifleştirmek için Webhook URL gerekli';
    }
    return null;
  }
  // whatsapp
  if (!doc.apiUrl || !doc.apiKey || !doc.chatId) {
    return 'Entegrasyonu aktifleştirmek için API URL, API Key ve Chat ID gerekli';
  }
  return null;
}

function parseType(req) {
  const { type } = req.params;
  return TYPE_RE.test(type) ? type : null;
}

// Ayarları getir (yoksa varsayılanla oluştur)
router.get('/:type', async (req, res) => {
  const type = parseType(req);
  if (!type) return res.status(400).json({ message: 'Geçersiz entegrasyon tipi' });
  const doc = await getOrCreate(type);
  res.json({ ...doc.toJSON(), templateDefaults: DEFAULT_TEMPLATES });
});

// Ayarları kaydet
router.put('/:type', async (req, res) => {
  const type = parseType(req);
  if (!type) return res.status(400).json({ message: 'Geçersiz entegrasyon tipi' });

  const doc = await getOrCreate(type);
  const {
    enabled,
    apiUrl,
    apiKey,
    session,
    chatId,
    webhookUrl,
    notifyUptime,
    notifyDomains,
    notifyGithub,
    notifyGithubCi,
    notifyGithubRelease,
    notifyGithubIssue,
    domainThresholds,
    templates,
  } = req.body ?? {};

  if (apiUrl !== undefined) {
    const v = apiUrl.toString().trim();
    if (v && !isValidHttpUrl(v)) {
      return res.status(400).json({ message: 'API URL geçerli bir http(s) adres olmalı' });
    }
    doc.apiUrl = v;
  }
  if (apiKey !== undefined) doc.apiKey = apiKey.toString().trim();
  if (session !== undefined) doc.session = session.toString().trim() || 'default';
  if (chatId !== undefined) doc.chatId = chatId.toString().trim();
  if (webhookUrl !== undefined) {
    const v = webhookUrl.toString().trim();
    if (v && !isValidHttpUrl(v)) {
      return res.status(400).json({ message: 'Webhook URL geçerli bir http(s) adres olmalı' });
    }
    doc.webhookUrl = v;
  }
  if (notifyUptime !== undefined) doc.notifyUptime = Boolean(notifyUptime);
  if (notifyDomains !== undefined) doc.notifyDomains = Boolean(notifyDomains);
  if (notifyGithub !== undefined) doc.notifyGithub = Boolean(notifyGithub);
  if (notifyGithubCi !== undefined) doc.notifyGithubCi = Boolean(notifyGithubCi);
  if (notifyGithubRelease !== undefined) doc.notifyGithubRelease = Boolean(notifyGithubRelease);
  if (notifyGithubIssue !== undefined) doc.notifyGithubIssue = Boolean(notifyGithubIssue);
  if (domainThresholds !== undefined) {
    const parsed = parseThresholds(domainThresholds);
    if (parsed === null) {
      return res.status(400).json({ message: 'Eşik listesi geçersiz' });
    }
    doc.domainThresholds = parsed;
  }
  if (enabled !== undefined) doc.enabled = Boolean(enabled);
  if (templates !== undefined && templates !== null && typeof templates === 'object') {
    if (!doc.templates) doc.templates = {};
    for (const key of TEMPLATE_KEYS) {
      if (templates[key] !== undefined) {
        // boş string = varsayılana dön
        const v = templates[key] === null ? '' : templates[key].toString();
        if (v.length > 2000) {
          return res.status(400).json({ message: 'Şablon en fazla 2000 karakter olabilir' });
        }
        doc.templates[key] = v.trim();
      }
    }
  }

  const requiredError = validateRequiredFields(doc);
  if (requiredError) return res.status(400).json({ message: requiredError });

  await doc.save();
  res.json({ ...doc.toJSON(), templateDefaults: DEFAULT_TEMPLATES });
});

// Test mesajı gönder (senkron; hata mesajı kullanıcıya döner)
router.post('/:type/test', async (req, res) => {
  const type = parseType(req);
  if (!type) return res.status(400).json({ message: 'Geçersiz entegrasyon tipi' });

  const doc = await getOrCreate(type);

  const missing = WEBHOOK_TYPES.has(type)
    ? !doc.webhookUrl && 'Önce Webhook URL alanını doldurun'
    : !(doc.apiUrl && doc.apiKey && doc.chatId) &&
      'Önce API URL, API Key ve Chat ID alanlarını doldurun';
  if (missing) return res.status(400).json({ message: missing });

  try {
    await sendToIntegration(doc, 'Takip Paneli bağlantı testi ✅');
    doc.lastTestedAt = new Date();
    doc.lastTestOk = true;
    await doc.save();
    res.json({ message: 'Test mesajı gönderildi, kanalı kontrol et', ok: true });
  } catch (err) {
    doc.lastTestedAt = new Date();
    doc.lastTestOk = false;
    await doc.save();
    res.status(400).json({ message: `Test mesajı gönderilemedi: ${err.message}`, ok: false });
  }
});

export default router;
