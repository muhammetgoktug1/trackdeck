import { Router } from 'express';
import GithubRepo from '../models/GithubRepo.js';
import GithubSetting from '../models/GithubSetting.js';
import { ghRequest, ghCount, clearGithubCache } from '../lib/github.js';

const router = Router();

// "kullanici/repo" (URL形式i de kabul eder: https://github.com/a/b.git)
const FULL_NAME_RE = /^[\w.-]+\/[\w.-]+$/;

function normalizeFullName(input) {
  return String(input ?? '')
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
}

function maskToken(token) {
  if (!token) return '';
  return token.length <= 12 ? '••••••' : `${token.slice(0, 7)}…${token.slice(-4)}`;
}

async function getToken() {
  const setting = await GithubSetting.getSingleton();
  return setting.token || '';
}

function parseId(req) {
  const { id } = req.params;
  return /^[0-9a-fA-F]{24}$/.test(id) ? id : null;
}

async function findRepo(req, res) {
  const id = parseId(req);
  if (!id) {
    res.status(400).json({ message: 'Geçersiz kimlik' });
    return null;
  }
  const repo = await GithubRepo.findById(id);
  if (!repo) {
    res.status(404).json({ message: 'Repo bulunamadı' });
    return null;
  }
  return repo;
}

// GitHub'ın workflow run / issue / commit alanlarını panelin ihtiyacına indirger
const mappers = {
  overview: (gh) => ({
    fullName: gh.full_name,
    description: gh.description ?? '',
    private: gh.private,
    defaultBranch: gh.default_branch,
    htmlUrl: gh.html_url,
    stars: gh.stargazers_count,
    forks: gh.forks_count,
    watchers: gh.subscribers_count,
    openIssues: gh.open_issues_count,
    language: gh.language,
    pushedAt: gh.pushed_at,
    updatedAt: gh.updated_at,
  }),
  actions: (gh) =>
    (gh.workflow_runs ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      title: r.display_title || r.name,
      event: r.event,
      status: r.status, // queued | in_progress | completed
      conclusion: r.conclusion, // success | failure | cancelled | ...
      branch: r.head_branch,
      shortSha: (r.head_sha ?? '').slice(0, 7),
      runNumber: r.run_number,
      htmlUrl: r.html_url,
      startedAt: r.run_started_at || r.created_at,
      updatedAt: r.updated_at,
    })),
  commits: (gh) =>
    (gh ?? []).map((c) => ({
      sha: c.sha,
      shortSha: (c.sha ?? '').slice(0, 7),
      message: (c.commit?.message ?? '').split('\n')[0],
      authorName: c.commit?.author?.name ?? '',
      authorLogin: c.author?.login ?? null,
      authorAvatar: c.author?.avatar_url ?? null,
      date: c.commit?.author?.date ?? null,
      htmlUrl: c.html_url,
    })),
  issues: (gh) =>
    // issues endpointi PR'ları da içerir; ayıkla
    (gh ?? [])
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        htmlUrl: i.html_url,
        user: i.user?.login ?? '',
        labels: (i.labels ?? []).map((l) => ({ name: l.name, color: l.color })),
        comments: i.comments,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
      })),
  pulls: (gh) =>
    (gh ?? []).map((p) => ({
      number: p.number,
      title: p.title,
      draft: p.draft,
      state: p.state,
      htmlUrl: p.html_url,
      user: p.user?.login ?? '',
      branch: p.head?.ref ?? '',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
  releases: (gh) =>
    (gh ?? []).map((r) => ({
      tagName: r.tag_name,
      name: r.name || r.tag_name,
      prerelease: r.prerelease,
      draft: r.draft,
      publishedAt: r.published_at,
      htmlUrl: r.html_url,
      authorLogin: r.author?.login ?? '',
      body: r.body ?? '',
    })),
};

// Sekme verisi uçları — hepsi aynı kalıbı izler: repo → GitHub API → map
const TAB_ENDPOINTS = {
  overview: (full) => `/repos/${full}`,
  actions: (full, limit) => `/repos/${full}/actions/runs?per_page=${limit}`,
  commits: (full, limit) => `/repos/${full}/commits?per_page=${limit}`,
  issues: (full, limit) => `/repos/${full}/issues?state=open&sort=updated&direction=desc&per_page=${limit}`,
  pulls: (full, limit) => `/repos/${full}/pulls?state=open&sort=updated&direction=desc&per_page=${limit}`,
  releases: (full, limit) => `/repos/${full}/releases?per_page=${limit}`,
};

// ---- Ayarlar ----

router.get('/settings', async (_req, res) => {
  const setting = await GithubSetting.getSingleton();
  res.json({ tokenConfigured: Boolean(setting.token), tokenMasked: maskToken(setting.token) });
});

// Token kaydet; doluysa önce GitHub'da doğrulanır. Boş göndermek = anonim moda dönüş.
router.put('/settings', async (req, res) => {
  const token = (req.body?.token ?? '').toString().trim();
  if (token) {
    try {
      await ghRequest('/user', { token });
    } catch (err) {
      return res.status(400).json({ message: `Token doğrulanamadı: ${err.message}` });
    }
  }
  const setting = await GithubSetting.getSingleton();
  setting.token = token;
  await setting.save();
  // yetki değişti; cache'i tazele
  clearGithubCache();
  res.json({ tokenConfigured: Boolean(token), tokenMasked: maskToken(token) });
});

// ---- İzlenen repolar ----

router.get('/repos', async (_req, res) => {
  // sıralanmış repolar önce; position'ı olmayanlar eklenme sırasına göre sonraya düşmez,
  // null değerleri sayılardan önce geldiği için sıralanmamış repolar listede önde kalır
  const repos = await GithubRepo.find().sort({ position: 1, createdAt: 1 });
  res.json({ data: repos });
});

router.post('/repos', async (req, res) => {
  const fullName = normalizeFullName(req.body?.fullName);
  if (!FULL_NAME_RE.test(fullName)) {
    return res.status(400).json({ message: 'Depo adı "kullanici/repo" biçiminde olmalı' });
  }

  const exists = await GithubRepo.findOne({ fullName });
  if (exists) return res.status(400).json({ message: 'Bu repo zaten takip listesinde' });

  let gh;
  try {
    gh = await ghRequest(`/repos/${fullName}`, { token: await getToken() });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  // yeni repo her zaman listenin sonuna eklenir
  const lastSorted = await GithubRepo.findOne().sort({ position: -1 });

  const repo = await GithubRepo.create({
    owner: gh.owner?.login ?? fullName.split('/')[0],
    name: gh.name,
    fullName: gh.full_name,
    description: gh.description ?? '',
    private: gh.private,
    defaultBranch: gh.default_branch,
    htmlUrl: gh.html_url,
    pushedAt: gh.pushed_at,
    position: (lastSorted?.position ?? -1) + 1,
  });
  res.status(201).json(repo);
});

router.delete('/repos/:id', async (req, res) => {
  const repo = await findRepo(req, res);
  if (!repo) return;
  await GithubRepo.findByIdAndDelete(repo.id);
  res.json({ message: 'Repo takipten çıkarıldı', id: repo.id });
});

// Paneldeki sürükle-bırak sıralamasını kaydeder; dizi sırası position olur.
router.put('/repos/order', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
  if (!ids?.length || !ids.every((id) => /^[0-9a-fA-F]{24}$/.test(id))) {
    return res.status(400).json({ message: 'Geçerli bir ids dizisi (repo kimlikleri) gerekli' });
  }
  const ops = ids.map((id, index) => ({
    updateOne: { filter: { _id: id }, update: { $set: { position: index } } },
  }));
  const result = await GithubRepo.bulkWrite(ops, { ordered: false });
  res.json({ message: 'Sıralama kaydedildi', updated: result.modifiedCount });
});

// Kart ızgarası için tüm repoların özet istatistikleri. Bir reponun verisi
// alınamazsa (rate limit, özel repo vs.) hata o repoya gömülür, liste bozulmaz.
router.get('/repos/stats', async (_req, res) => {
  const repos = await GithubRepo.find().sort({ position: 1, createdAt: 1 });
  const token = await getToken();

  const data = await Promise.all(
    repos.map(async (repo) => {
      const base = {
        id: repo.id,
        fullName: repo.fullName,
        name: repo.name,
        owner: repo.owner,
        description: repo.description ?? '',
        private: repo.private,
        htmlUrl: repo.htmlUrl,
      };
      try {
        const full = `${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
        const [meta, commits, openPulls] = await Promise.all([
          ghRequest(`/repos/${full}`, { token }),
          ghCount(`/repos/${full}/commits?per_page=1`, { token }),
          ghCount(`/repos/${full}/pulls?state=open&per_page=1`, { token }),
        ]);
        // GitHub'ın open_issues sayacı PR'ları da içerir; gerçek issue = fark
        return {
          ...base,
          language: meta.language,
          pushedAt: meta.pushed_at,
          stars: meta.stargazers_count ?? 0,
          forks: meta.forks_count ?? 0,
          openPulls,
          openIssues: Math.max(0, (meta.open_issues_count ?? 0) - openPulls),
          commits,
          error: null,
        };
      } catch (err) {
        return {
          ...base,
          language: null,
          pushedAt: repo.pushedAt,
          stars: 0,
          forks: 0,
          openPulls: 0,
          openIssues: 0,
          commits: 0,
          error: err.message,
        };
      }
    })
  );

  res.json({ data });
});

// ---- Sekme verileri ----

for (const [tab, buildPath] of Object.entries(TAB_ENDPOINTS)) {
  router.get(`/repos/:id/${tab}`, async (req, res) => {
    const repo = await findRepo(req, res);
    if (!repo) return;

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    try {
      const raw = await ghRequest(buildPath(repo.fullName, limit), { token: await getToken() });
      res.json({ tab, data: mappers[tab](raw) });
    } catch (err) {
      res.status(502).json({ message: err.message });
    }
  });
}

export default router;
