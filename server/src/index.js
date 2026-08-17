import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import monitorRoutes from './routes/monitors.js';
import domainRoutes from './routes/domains.js';
import serverRoutes from './routes/servers.js';
import providerRoutes from './routes/providers.js';
import integrationRoutes from './routes/integrations.js';
import noteRoutes from './routes/notes.js';
import Note from './models/Note.js';
import { startDomainAlertScheduler } from './lib/domainAlerts.js';
import { startMonitorScheduler } from './lib/monitorScheduler.js';
import Monitor from './models/Monitor.js';
import Domain from './models/Domain.js';
import ServerModel from './models/Server.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Notlara eklenen dosyalar (pdf, docx, görsel vb.) buradan servis edilir
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

// Dashboard özeti: tek çağrıda tüm sayaçlar
app.get('/api/overview', async (_req, res) => {
  const [monitorTotal, monitorUp, domainTotal, serverTotal, noteTotal] = await Promise.all([
    Monitor.countDocuments({}),
    Monitor.countDocuments({ status: 'up' }),
    Domain.countDocuments({}),
    ServerModel.countDocuments({}),
    Note.countDocuments({}),
  ]);
  res.json({
    monitors: { total: monitorTotal, up: monitorUp },
    domains: domainTotal,
    servers: serverTotal,
    notes: noteTotal,
  });
});

app.use('/api/monitors', monitorRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/notes', noteRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Dosya boyutu 25MB sınırını aşıyor' });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Sunucu hatası' });
});

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisisel-proje';

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[api] MongoDB bağlandı: ${MONGODB_URI}`);
  } catch (err) {
    console.error(`[api] MongoDB bağlantı hatası: ${err.message}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[api] http://localhost:${PORT} adresinde çalışıyor`);
    startDomainAlertScheduler();
    startMonitorScheduler();
  });
}

start();
