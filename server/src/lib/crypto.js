// Şifre yöneticisi şifrelemesi: AES-256-GCM.
// Anahtar MASTER_KEY (hex, 32 bayt) — ilk açılışta yoksa üretilip server/.env'e
// yazılır (bind-mount ile hostta kalıcı). .env kaybolursa şifreler çözülemez!

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

let cachedKey = null;

function loadOrCreateMasterKey() {
  if (process.env.MASTER_KEY) {
    const key = Buffer.from(process.env.MASTER_KEY, 'hex');
    if (key.length === 32) return key;
    console.error('[crypto] MASTER_KEY geçersiz (32 bayt hex olmalı), yenisi üretiliyor');
  }

  const key = crypto.randomBytes(32);
  const hex = key.toString('hex');
  process.env.MASTER_KEY = hex;

  try {
    const envPath = path.join(process.cwd(), '.env');
    fs.appendFileSync(
      envPath,
      `\n# Şifre yöneticisi anahtarı — KAYBOLURSA ŞİFRELER ÇÖZÜLEMEZ!\nMASTER_KEY=${hex}\n`
    );
    console.log('[crypto] MASTER_KEY üretildi ve .env dosyasına kaydedildi');
  } catch (err) {
    console.error('[crypto] .env yazılamadı, geçici anahtar kullanılıyor:', err.message);
  }
  return key;
}

function masterKey() {
  if (!cachedKey) cachedKey = loadOrCreateMasterKey();
  return cachedKey;
}

// "iv:tag:ciphertext" (base64 parçalar) döner
export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString('base64')).join(':');
}

export function decrypt(payload) {
  const [ivB64, tagB64, dataB64] = String(payload ?? '').split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Şifreli veri bozuk');
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
