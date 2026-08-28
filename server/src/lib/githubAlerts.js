// GitHub bildirim tarayıcısı: izlenen repoların CI kırılmalarını,
// yeni release'lerini ve yeni issue'larını düzenli tarar, aktif
// entegrasyon kanallarına (whatsapp/slack/discord) bildirir.

import Integration from '../models/Integration.js';
import GithubRepo from '../models/GithubRepo.js';
import GithubSetting from '../models/GithubSetting.js';
import { ghRequest } from './github.js';
import { sendToIntegration } from './notify.js';
import { DEFAULT_TEMPLATES, renderTemplate } from './messageTemplates.js';

const SCAN_INTERVAL_MS = 5 * 60_000;
// Yeniden başlama/ilk kurulum sonrası eski kayıtların sel gibi gelmesini önler
const RECENT_WINDOW_MS = 24 * 3_600_000;

const CI_FAILURE_CONCLUSIONS = new Set(['failure', 'startup_failure', 'timed_out']);

// Bildirimi hak eden kanallara şablonla gönder
async function notifyChannels(kind, vars) {
  const configs = await Integration.find({ enabled: true, notifyGithub: true });
  await Promise.allSettled(
    configs.map(async (cfg) => {
      try {
        if (kind === 'githubCi' && cfg.notifyGithubCi === false) return;
        if (kind === 'githubRelease' && cfg.notifyGithubRelease === false) return;
        if (kind === 'githubIssue' && cfg.notifyGithubIssue !== true) return;
        const text = renderTemplate(cfg.templates?.[kind] || DEFAULT_TEMPLATES[kind], vars);
        await sendToIntegration(cfg, text);
      } catch (err) {
        console.error(`[bildirim] github ${cfg.type}: ${err.message}`);
      }
    })
  );
}

async function scanRepo(repo, token) {
  const stamp = new Date().toLocaleString('tr-TR');
  const firstScan =
    repo.lastRunId === null && repo.lastReleaseAt === null && repo.lastIssueNumber === null;
  let notified = 0;

  // --- CI kırılmaları ---
  try {
    const runs = await ghRequest(`/repos/${repo.fullName}/actions/runs?per_page=15`, { token });
    const all = runs.workflow_runs ?? [];
    const newestRunId = all.reduce((max, r) => Math.max(max, r.id), 0) || null;

    if (repo.lastRunId !== null) {
      for (const r of all) {
        if (r.id <= repo.lastRunId) continue;
        if (!CI_FAILURE_CONCLUSIONS.has(r.conclusion)) continue;
        await notifyChannels('githubCi', {
          repo: repo.fullName,
          workflow: r.name,
          runNumber: r.run_number,
          branch: r.head_branch ?? '-',
          title: r.display_title || r.name,
          url: r.html_url,
          time: stamp,
        });
        notified++;
      }
    }
    if (newestRunId !== null) repo.lastRunId = newestRunId;
  } catch (err) {
    console.error(`[bildirim] github ci ${repo.fullName}: ${err.message}`);
  }

  // --- Yeni release'ler ---
  try {
    const releases = await ghRequest(`/repos/${repo.fullName}/releases?per_page=10`, { token });
    const published = (releases ?? []).filter((r) => r.published_at && !r.draft);
    const newestReleaseAt = published.reduce(
      (max, r) => Math.max(max, new Date(r.published_at).getTime()),
      0
    );

    if (repo.lastReleaseAt !== null) {
      for (const r of published) {
        const at = new Date(r.published_at).getTime();
        if (at <= repo.lastReleaseAt.getTime()) continue;
        if (Date.now() - at > RECENT_WINDOW_MS) continue; // eski kayıt, atl a
        await notifyChannels('githubRelease', {
          repo: repo.fullName,
          tag: r.tag_name,
          url: r.html_url,
          time: stamp,
        });
        notified++;
      }
    }
    if (newestReleaseAt > 0) repo.lastReleaseAt = new Date(newestReleaseAt);
  } catch (err) {
    console.error(`[bildirim] github release ${repo.fullName}: ${err.message}`);
  }

  // --- Yeni issue'lar ---
  try {
    const issues = await ghRequest(
      `/repos/${repo.fullName}/issues?state=all&sort=created&direction=desc&per_page=15`,
      { token }
    );
    // issues endpointi PR'ları da içerir; ayıkla
    const real = (issues ?? []).filter((i) => !i.pull_request);
    const newestNumber = real.reduce((max, i) => Math.max(max, i.number), 0) || null;

    if (repo.lastIssueNumber !== null) {
      for (const i of real) {
        if (i.number <= repo.lastIssueNumber) continue;
        if (Date.now() - new Date(i.created_at).getTime() > RECENT_WINDOW_MS) continue;
        await notifyChannels('githubIssue', {
          repo: repo.fullName,
          number: i.number,
          title: i.title,
          url: i.html_url,
          time: stamp,
        });
        notified++;
      }
    }
    if (newestNumber !== null) repo.lastIssueNumber = newestNumber;
  } catch (err) {
    console.error(`[bildirim] github issue ${repo.fullName}: ${err.message}`);
  }

  await repo.save();
  if (firstScan) {
    console.log(`[bildirim] github referans alındı (ilk tarama): ${repo.fullName}`);
  } else if (notified > 0) {
    console.log(`[bildirim] github ${repo.fullName}: ${notified} bildirim gönderildi`);
  }
}

async function scanGithub() {
  const repos = await GithubRepo.find({ enabled: true });
  if (repos.length === 0) return;

  const activeChannels = await Integration.countDocuments({ enabled: true, notifyGithub: true });
  if (activeChannels === 0) return; // dinleyen yoksa GitHub API'yi yorma

  const setting = await GithubSetting.getSingleton();
  for (const repo of repos) {
    await scanRepo(repo, setting.token || '');
  }
}

export function startGithubAlertScheduler() {
  setTimeout(() => {
    scanGithub().catch((err) => console.error('[bildirim] github taraması:', err.message));
  }, 30_000);
  setInterval(() => {
    scanGithub().catch((err) => console.error('[bildirim] github taraması:', err.message));
  }, SCAN_INTERVAL_MS);
  console.log('[bildirim] github tarayıcısı 5 dakikada bir çalışacak');
}
