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
import customerRoutes from './routes/customers.js';
import companyRoutes from './routes/companies.js';
import categoryRoutes from './routes/categories.js';
import credentialRoutes from './routes/credentials.js';
import credentialCategoryRoutes from './routes/credentialCategories.js';
import integrationRoutes from './routes/integrations.js';
import githubRoutes from './routes/github.js';
import noteRoutes from './routes/notes.js';
import Note from './models/Note.js';
import { startDomainAlertScheduler } from './lib/domainAlerts.js';
import { startMonitorScheduler } from './lib/monitorScheduler.js';
import { startGithubAlertScheduler } from './lib/githubAlerts.js';
import Monitor from './models/Monitor.js';
import Domain from './models/Domain.js';
import ServerModel from './models/Server.js';
import CheckLog from './models/CheckLog.js';

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

// Dashboard özeti: tek çağrıda sayaçlar + ilgi odaklı veri
// (down monitörler, yaklaşan domain bitişleri, 7 günlük uptime)
app.get('/api/overview', async (_req, res) => {
  const since7d = new Date(Date.now() - 7 * 86_400_000);
  const in30d = new Date(Date.now() + 30 * 86_400_000);

  const [
    monitorTotal,
    monitorUp,
    monitorDown,
    monitorPaused,
    domainTotal,
    serverTotal,
    noteTotal,
    downDocs,
    expiringDocs,
    agg7d,
  ] = await Promise.all([
    Monitor.countDocuments({}),
    Monitor.countDocuments({ status: 'up' }),
    Monitor.countDocuments({ status: 'down' }),
    Monitor.countDocuments({ status: 'paused' }),
    Domain.countDocuments({}),
    ServerModel.countDocuments({}),
    Note.countDocuments({}),
    Monitor.find({ status: 'down' }).sort({ lastCheckedAt: 1 }).limit(5),
    Domain.find({ expiresAt: { $ne: null, $lte: in30d } })
      .sort({ expiresAt: 1 })
      .limit(5)
      .select('name expiresAt'),
    CheckLog.aggregate([
      { $match: { checkedAt: { $gte: since7d } } },
      {
        $group: {
          _id: '$monitor',
          up: { $sum: { $cond: [{ $eq: ['$status', 'up'] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Down süresi: son 'up' ölçümünden bu yana (down az sayıda olduğundan ucuz)
  const downMonitors = await Promise.all(
    downDocs.map(async (m) => {
      const lastUp = await CheckLog.findOne({ monitor: m._id, status: 'up' })
        .sort({ checkedAt: -1 })
        .select('checkedAt');
      const since = lastUp?.checkedAt ?? m.lastCheckedAt ?? new Date();
      return {
        id: m.id,
        name: m.name,
        url: m.url,
        status: m.status,
        lastStatusCode: m.lastStatusCode ?? null,
        lastCheckedAt: m.lastCheckedAt,
        downMinutes: Math.max(0, Math.round((Date.now() - since.getTime()) / 60_000)),
      };
    })
  );

  const withChecks = agg7d.filter((r) => r.total > 0);
  const checks7d = agg7d.reduce(
    (acc, r) => ({ total: acc.total + r.total, up: acc.up + r.up }),
    { total: 0, up: 0 }
  );
  const uptime7dAvg =
    withChecks.length === 0
      ? null
      : Math.round(
          (withChecks.reduce((s, r) => s + r.up / r.total, 0) / withChecks.length) * 1000
        ) / 10;

  const domainsExpiring = expiringDocs.map((d) => ({
    id: d.id,
    name: d.name,
    expiresAt: d.expiresAt,
    days: Math.ceil((d.expiresAt.getTime() - Date.now()) / 86_400_000),
  }));

  res.json({
    monitors: { total: monitorTotal, up: monitorUp, down: monitorDown, paused: monitorPaused },
    domains: domainTotal,
    servers: serverTotal,
    notes: noteTotal,
    downMonitors,
    domainsExpiring,
    checks7d,
    uptime7dAvg,
  });
});

app.use('/api/monitors', monitorRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/credential-categories', credentialCategoryRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/github', githubRoutes);
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

const PORT = Number(process.env.PORT) || 40010;
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
    startGithubAlertScheduler();
  });
}

start();
