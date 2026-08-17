// Tek seferlik taşıma: kisisel-takip → kisisel-proje
// Kullanım: node scripts/migrate-db.mjs
import mongoose from 'mongoose';

const OLD_URI = 'mongodb://127.0.0.1:27017/kisisel-takip';
const NEW_URI = 'mongodb://127.0.0.1:27017/kisisel-proje';

const oldConn = await mongoose.createConnection(OLD_URI).asPromise();
const newConn = await mongoose.createConnection(NEW_URI).asPromise();

const oldDb = oldConn.db;
const newDb = newConn.db;

const collections = await oldDb.listCollections().toArray();
if (collections.length === 0) {
  console.log('Eski veritabanı boş, taşınacak bir şey yok.');
} else {
  for (const { name } of collections) {
    const docs = await oldDb.collection(name).find().toArray();
    if (docs.length > 0) {
      await newDb.collection(name).insertMany(docs);
    }
    console.log(`${name}: ${docs.length} doküman taşındı`);
  }
}

await oldDb.dropDatabase();
console.log('Eski veritabanı (kisisel-takip) silindi.');

await oldConn.close();
await newConn.close();
console.log('Taşıma tamam: kisisel-proje hazır.');
process.exit(0);
