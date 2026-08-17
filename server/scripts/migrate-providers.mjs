// Tek seferlik taşıma: domain.registrar / server.provider string değerleri
// Provider koleksiyonuna çevrilir ve ref olarak bağlanır.
// Kullanım: node scripts/migrate-providers.mjs
import mongoose from 'mongoose';

const URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisisel-proje';

const conn = await mongoose.createConnection(URI).asPromise();
const db = conn.db;

const nameToId = new Map();

async function ensureProvider(name) {
  const key = name.toLowerCase();
  if (nameToId.has(key)) return nameToId.get(key);

  // Büyük/küçük harf varyasyonlarını birleştir
  const existing = await db
    .collection('providers')
    .findOne({ name: { $regex: `^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
  if (existing) {
    nameToId.set(key, existing._id);
    return existing._id;
  }

  const inserted = await db.collection('providers').insertOne({
    name,
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  nameToId.set(key, inserted.insertedId);
  console.log(`+ sağlayıcı: ${name}`);
  return inserted.insertedId;
}

// Domainlerdeki eski registrar stringleri
const domains = await db
  .collection('domains')
  .find({ registrar: { $exists: true, $nin: [null, ''] } })
  .toArray();
for (const d of domains) {
  const pid = await ensureProvider(d.registrar.trim());
  await db
    .collection('domains')
    .updateOne({ _id: d._id }, { $set: { provider: pid }, $unset: { registrar: '' } });
  console.log(`domain "${d.name}" → sağlayıcı bağlandı`);
}

// Sunuculardaki eski provider stringleri (alan adı aynı, sadece string → ObjectId)
const servers = await db
  .collection('servers')
  .find({ provider: { $exists: true, $type: 'string', $nin: [null, ''] } })
  .toArray();
for (const s of servers) {
  const pid = await ensureProvider(s.provider.trim());
  await db.collection('servers').updateOne({ _id: s._id }, { $set: { provider: pid } });
  console.log(`sunucu "${s.name}" → sağlayıcı bağlandı`);
}

await conn.close();
console.log('Sağlayıcı taşıması tamam.');
process.exit(0);
