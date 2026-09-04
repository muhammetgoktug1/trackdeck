import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CircleDot,
  Clock,
  ExternalLink,
  Github,
  GitBranch,
  GitCommitHorizontal,
  GitFork,
  GitPullRequest,
  GripVertical,
  Inbox,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings2,
  Star,
  Tag,
  Workflow,
  X,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDateTR, formatInterval, timeAgo } from '../lib/format.js';
import GithubRepoModal from '../components/GithubRepoModal.jsx';
import GithubSettingsModal from '../components/GithubSettingsModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import PageContainer from '../components/PageContainer.jsx';

const TABS = [
  { id: 'overview', label: 'Özet', icon: Activity },
  { id: 'actions', label: 'Actions', icon: Workflow },
  { id: 'commits', label: 'Commitler', icon: GitCommitHorizontal },
  { id: 'issues', label: "Issue'lar", icon: CircleDot },
  { id: 'pulls', label: "PR'lar", icon: GitPullRequest },
  { id: 'releases', label: 'Release\'ler', icon: Tag },
];

const EMPTY_MESSAGES = {
  actions: 'Henüz workflow çalışması yok',
  commits: 'Commit bulunamadı',
  issues: 'Açık issue yok 🎉',
  pulls: 'Açık pull request yok',
  releases: 'Henüz release yayınlanmamış',
};

// Actions run durumları → rozet görünümü
const RUN_META = {
  success: { label: 'Başarılı', chip: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20', spin: false },
  failure: { label: 'Başarısız', chip: 'bg-rose-500/10 text-rose-400 ring-rose-500/20', spin: false },
  startup_failure: { label: 'Başarısız', chip: 'bg-rose-500/10 text-rose-400 ring-rose-500/20', spin: false },
  timed_out: { label: 'Zaman aşımı', chip: 'bg-rose-500/10 text-rose-400 ring-rose-500/20', spin: false },
  cancelled: { label: 'İptal', chip: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20', spin: false },
  skipped: { label: 'Atlandı', chip: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20', spin: false },
  in_progress: { label: 'Çalışıyor', chip: 'bg-amber-500/10 text-amber-400 ring-amber-500/20', spin: true },
  queued: { label: 'Sırada', chip: 'bg-amber-500/10 text-amber-400 ring-amber-500/20', spin: false },
};

function RunBadge({ run }) {
  const key = run.status === 'completed' ? run.conclusion : run.status;
  const meta = RUN_META[key] ?? {
    label: key ?? 'bilinmiyor',
    chip: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
    spin: false,
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${meta.chip}`}
    >
      {meta.spin && <Loader2 className="h-3 w-3 animate-spin" />}
      {meta.label}
    </span>
  );
}

function ListCard({ title, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
      <div className="flex items-center gap-2.5 border-b border-zinc-800/80 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="divide-y divide-zinc-800/50">{children}</div>
    </div>
  );
}

function RowLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-zinc-800/30"
    >
      {children}
      <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-600" />
    </a>
  );
}

function EmptyTab({ tab }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-6 pb-12 pt-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
        <Inbox className="h-7 w-7 text-zinc-500" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-zinc-200">
        {EMPTY_MESSAGES[tab] ?? 'Kayıt yok'}
      </h3>
    </div>
  );
}

function OverviewTab({ data }) {
  const stats = [
    { icon: Star, label: 'Yıldız', value: data.stars ?? 0 },
    { icon: GitFork, label: 'Fork', value: data.forks ?? 0 },
    { icon: CircleDot, label: 'Açık Issue', value: data.openIssues ?? 0 },
    { icon: GitBranch, label: 'Varsayılan Branch', value: data.defaultBranch || '—' },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-4"
          >
            <div className="flex items-center gap-2 text-zinc-500">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="mt-2 truncate text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2 text-zinc-400">
            <Clock className="h-4 w-4 text-zinc-500" />
            Son push: <span className="font-semibold text-zinc-200">{timeAgo(data.pushedAt)}</span>
          </span>
          <span className="flex items-center gap-2 text-zinc-400">
            {data.private ? '🔒' : '🌐'}
            {data.private ? 'Private repo' : 'Public repo'}
          </span>
          {data.language && (
            <span className="text-zinc-400">
              Dil: <span className="font-semibold text-zinc-200">{data.language}</span>
            </span>
          )}
        </div>
        {data.description && (
          <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-500">{data.description}</p>
        )}
        <a
          href={data.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
        >
          <Github className="h-3.5 w-3.5" />
          {data.fullName}
        </a>
      </div>
    </div>
  );
}

function ActionsTab({ data }) {
  if (!data.length) return <EmptyTab tab="actions" />;
  return (
    <ListCard title="Workflow Çalışmaları">
      {data.map((run) => {
        const durationSec =
          run.startedAt && run.updatedAt
            ? Math.max(0, (new Date(run.updatedAt) - new Date(run.startedAt)) / 1000)
            : null;
        return (
          <RowLink key={run.id} href={run.htmlUrl}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-100">
                {run.title || run.name}{' '}
                <span className="font-normal text-zinc-600">#{run.runNumber}</span>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span className="font-medium text-zinc-400">{run.name}</span>
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {run.branch}
                </span>
                <code className="rounded bg-zinc-800/70 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 ring-1 ring-zinc-700/60">
                  {run.shortSha}
                </code>
                <span>{timeAgo(run.updatedAt)}</span>
                {durationSec !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatInterval(Math.round(durationSec))}
                  </span>
                )}
              </p>
            </div>
            <RunBadge run={run} />
          </RowLink>
        );
      })}
    </ListCard>
  );
}

function CommitsTab({ data }) {
  if (!data.length) return <EmptyTab tab="commits" />;
  return (
    <ListCard title="Son Commitler">
      {data.map((c) => (
        <RowLink key={c.sha} href={c.htmlUrl}>
          {c.authorAvatar ? (
            <img
              src={c.authorAvatar}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full ring-1 ring-zinc-700/60"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-400 ring-1 ring-zinc-700/60">
              {(c.authorName || '?').slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-100">{c.message}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-zinc-500">
              <span className="font-medium text-zinc-400">{c.authorLogin || c.authorName}</span>
              <span>{timeAgo(c.date)}</span>
              <code className="rounded bg-zinc-800/70 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 ring-1 ring-zinc-700/60">
                {c.shortSha}
              </code>
            </p>
          </div>
        </RowLink>
      ))}
    </ListCard>
  );
}

function IssuesTab({ data }) {
  if (!data.length) return <EmptyTab tab="issues" />;
  return (
    <ListCard title="Açık Issue'lar">
      {data.map((i) => (
        <RowLink key={i.number} href={i.htmlUrl}>
          <CircleDot className="h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-100">
              <span className="mr-1.5 text-zinc-600">#{i.number}</span>
              {i.title}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="font-medium text-zinc-400">{i.user}</span>
              <span>{timeAgo(i.updatedAt)}</span>
              {i.comments > 0 && (
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {i.comments}
                </span>
              )}
              {i.labels.map((l) => (
                <span
                  key={l.name}
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `#${l.color}22`,
                    color: `#${l.color}`,
                    boxShadow: `inset 0 0 0 1px #${l.color}55`,
                  }}
                >
                  {l.name}
                </span>
              ))}
            </p>
          </div>
        </RowLink>
      ))}
    </ListCard>
  );
}

function PullsTab({ data }) {
  if (!data.length) return <EmptyTab tab="pulls" />;
  return (
    <ListCard title="Açık Pull Request'ler">
      {data.map((p) => (
        <RowLink key={p.number} href={p.htmlUrl}>
          <GitPullRequest className="h-4 w-4 shrink-0 text-indigo-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-100">
              <span className="mr-1.5 text-zinc-600">#{p.number}</span>
              {p.title}
              {p.draft && (
                <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/20">
                  Taslak
                </span>
              )}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-zinc-500">
              <span className="font-medium text-zinc-400">{p.user}</span>
              <span className="inline-flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {p.branch}
              </span>
              <span>{timeAgo(p.updatedAt)}</span>
            </p>
          </div>
        </RowLink>
      ))}
    </ListCard>
  );
}

function ReleasesTab({ data }) {
  if (!data.length) return <EmptyTab tab="releases" />;
  return (
    <ListCard title="Release'ler">
      {data.map((r) => (
        <RowLink key={`${r.tagName}-${r.publishedAt}`} href={r.htmlUrl}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <Tag className="h-4 w-4 text-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-100">
              {r.name}
              {r.prerelease && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/20">
                  pre-release
                </span>
              )}
              {r.draft && (
                <span className="rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 ring-1 ring-zinc-500/20">
                  taslak
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {formatDateTR(r.publishedAt)} · {r.authorLogin}
            </p>
          </div>
        </RowLink>
      ))}
    </ListCard>
  );
}

const TAB_COMPONENTS = {
  overview: OverviewTab,
  actions: ActionsTab,
  commits: CommitsTab,
  issues: IssuesTab,
  pulls: PullsTab,
  releases: ReleasesTab,
};

// 1234 → "1,2b" gibi kısaltır; kart istatistikleri dar alana sığsın
function formatCount(n) {
  if (n == null) return '—';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '')}b`;
  return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(/,0$/, '')}m`;
}

function StatCell({ icon: Icon, label, value, loading }) {
  return (
    <span className="flex min-w-0 flex-col items-center gap-1" title={`${label}: ${value ?? '—'}`}>
      {loading ? (
        <span className="h-3.5 w-3.5 animate-pulse rounded bg-zinc-700/70" />
      ) : (
        <Icon className="h-3.5 w-3.5 text-zinc-500" />
      )}
      <span className="text-[13px] font-bold tabular-nums text-zinc-200">
        {loading ? <span className="inline-block h-4 w-8 animate-pulse rounded bg-zinc-700/70" /> : formatCount(value)}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">{label}</span>
    </span>
  );
}

// Sürükle-bırak sıralanabilir repo kartı. dragProps: GithubPage'ten gelen
// HTML5 DnD handler'ları (draggable/onDragStart/onDragOver/onDrop/onDragEnd).
function RepoCard({ repo, stat, statLoading, active, onSelect, onDelete, dragProps, dragged, dropTarget }) {
  const stats = stat
    ? [
        { icon: GitCommitHorizontal, label: 'Commit', value: stat.commits },
        { icon: GitPullRequest, label: 'PR', value: stat.openPulls },
        { icon: CircleDot, label: 'Issue', value: stat.openIssues },
        { icon: Star, label: 'Yıldız', value: stat.stars },
        { icon: GitFork, label: 'Fork', value: stat.forks },
      ]
    : [];

  return (
    <div
      draggable={dragProps?.draggable}
      onDragStart={dragProps?.onDragStart}
      onDragEnd={dragProps?.onDragEnd}
      onDragOver={dragProps?.onDragOver}
      onDragLeave={dragProps?.onDragLeave}
      onDrop={dragProps?.onDrop}
      onMouseUp={dragProps?.onDisarmDrag}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`group relative flex cursor-pointer select-none flex-col rounded-2xl border bg-zinc-900/50 p-4 transition-all ${
        active
          ? 'border-indigo-500/40 bg-indigo-500/10 ring-1 ring-indigo-500/40'
          : 'border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80'
      } ${dragged ? 'opacity-40' : ''} ${dropTarget ? 'ring-2 ring-indigo-400' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 shrink-0 cursor-grab text-zinc-700 transition-colors hover:text-zinc-400 active:cursor-grabbing"
          title="Sıralamak için sürükle"
          onMouseDown={dragProps?.onArmDrag}
          onMouseUp={dragProps?.onDisarmDrag}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">
            {repo.name}
            {repo.private && <span className="ml-1.5 align-middle text-[11px]">🔒</span>}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-zinc-500">
            <span className="truncate">{repo.owner}</span>
            {stat?.language && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="truncate text-zinc-400">{stat.language}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {repo.htmlUrl && (
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noreferrer"
              title="GitHub'da aç"
              onClick={(e) => e.stopPropagation()}
              className="rounded-md p-1 text-zinc-600 opacity-0 transition-all hover:bg-zinc-800/70 hover:text-zinc-300 focus:opacity-100 group-hover:opacity-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            type="button"
            title="Takipten çıkar"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-md p-1 text-zinc-600 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {repo.description && (
        <p className="mt-2.5 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-zinc-500">
          {repo.description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-1 border-t border-zinc-800/60 px-1 pt-3">
        {stats.length ? (
          stats.map(({ icon, label, value }) => (
            <StatCell key={label} icon={icon} label={label} value={value} loading={statLoading} />
          ))
        ) : (
          <p className="py-2 text-[11px] text-zinc-600">İstatistikler yükleniyor...</p>
        )}
      </div>

      {stat?.error && (
        <p
          className="mt-2 truncate rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-400"
          title={stat.error}
        >
          İstatistik alınamadı
        </p>
      )}
    </div>
  );
}

export default function GithubPage() {
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [activeRepoId, setActiveRepoId] = useState(null);
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({ tokenConfigured: false, tokenMasked: '' });

  // kart istatistikleri: repo id → stat nesnesi
  const [stats, setStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);

  // sürükle-bırak durumu: armedId = handle'dan basılıyken kart draggable olur
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [armedId, setArmedId] = useState(null);

  const [repoModal, setRepoModal] = useState({ open: false, saving: false, error: '' });
  const [settingsModal, setSettingsModal] = useState({ open: false, saving: false, error: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const activeRepo = repos.find((r) => r.id === activeRepoId) ?? null;

  const loadRepos = useCallback(async ({ selectId } = {}) => {
    setReposLoading(true);
    try {
      const res = await api.listGithubRepos();
      setRepos(res.data);
      setActiveRepoId((current) => {
        const inList = res.data.some((r) => r.id === current);
        if (selectId && res.data.some((r) => r.id === selectId)) return selectId;
        if (inList) return current;
        return res.data[0]?.id ?? null;
      });
    } catch {
      setError('Repo listesi yüklenemedi');
    } finally {
      setReposLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.getGithubRepoStats();
      setStats(Object.fromEntries(res.data.map((s) => [s.id, s])));
    } catch {
      // kartlar temel bilgilerle ayakta kalır; sessiz geç
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadTab = useCallback(
    async ({ silent = false } = {}) => {
      if (!activeRepoId) return;
      if (!silent) setLoading(true);
      setError('');
      try {
        const res = await api.githubTabData(activeRepoId, tab);
        setData(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [activeRepoId, tab]
  );

  useEffect(() => {
    loadRepos();
    loadStats();
    api
      .getGithubSettings()
      .then(setSettings)
      .catch(() => {});
  }, [loadRepos, loadStats]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  // 60 saniyede bir sessiz tazeleme (rate-limit dostu)
  useEffect(() => {
    const timer = setInterval(() => loadTab({ silent: true }), 60_000);
    return () => clearInterval(timer);
  }, [loadTab]);

  const handleAddRepo = async (fullName) => {
    setRepoModal((m) => ({ ...m, saving: true, error: '' }));
    try {
      const repo = await api.addGithubRepo(fullName);
      setRepoModal({ open: false, saving: false, error: '' });
      await loadRepos({ selectId: repo.id });
      loadStats();
    } catch (err) {
      setRepoModal((m) => ({ ...m, saving: false, error: err.message }));
    }
  };

  const handleSaveSettings = async (token) => {
    setSettingsModal((m) => ({ ...m, saving: true, error: '' }));
    try {
      const res = await api.saveGithubSettings(token);
      setSettings(res);
      setSettingsModal({ open: false, saving: false, error: '' });
    } catch (err) {
      setSettingsModal((m) => ({ ...m, saving: false, error: err.message }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteGithubRepo(deleteTarget.id);
      setDeleteTarget(null);
      await loadRepos();
      loadStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // sürüklenen kartı hedef kartın yerine taşır; önce UI'ı günceller,
  // sunucu reddederse eski sıraya döner
  const handleReorder = async (fromId, toId) => {
    const previous = repos;
    const fromIndex = repos.findIndex((r) => r.id === fromId);
    const toIndex = repos.findIndex((r) => r.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const next = [...repos];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setRepos(next);

    try {
      await api.reorderGithubRepos(next.map((r) => r.id));
    } catch (err) {
      setRepos(previous);
      setError(`Sıralama kaydedilemedi: ${err.message}`);
    }
  };

  const resetDrag = () => {
    setDragId(null);
    setOverId(null);
    setArmedId(null);
  };

  // her karta aynı DnD davranışını bağlar; handle'a basılıyken kart sürüklenebilir olur
  const cardDragProps = (repo) => ({
    draggable: armedId === repo.id,
    onArmDrag: () => setArmedId(repo.id),
    onDisarmDrag: () => setArmedId(null),
    onDragStart: (e) => {
      setDragId(repo.id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', repo.id);
    },
    onDragEnd: resetDrag,
    onDragOver: (e) => {
      if (!dragId || dragId === repo.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverId(repo.id);
    },
    onDragLeave: () => setOverId((current) => (current === repo.id ? null : current)),
    onDrop: (e) => {
      e.preventDefault();
      const fromId = dragId ?? e.dataTransfer.getData('text/plain');
      if (fromId && fromId !== repo.id) handleReorder(fromId, repo.id);
      resetDrag();
    },
  });

  const TabContent = TAB_COMPONENTS[tab];

  return (
    <PageContainer>
      {/* Üst araç çubuğu: başlık + eylemler */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-bold text-white">Repolar</h1>
          {repos.length > 0 && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-400">
              {repos.length}
            </span>
          )}
          <span className="hidden text-xs text-zinc-600 md:inline">
            kartları tutamaçtan sürükleyerek sırala
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 sm:inline-flex ${
              settings.tokenConfigured
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                : 'bg-zinc-800/60 text-zinc-500 ring-zinc-700/60'
            }`}
            title={
              settings.tokenConfigured
                ? `Token: ${settings.tokenMasked}`
                : 'Anonim mod — yalnız public repolar, 60 istek/sa'
            }
          >
            {settings.tokenConfigured ? 'token aktif' : 'anonim mod'}
          </span>
          <button
            type="button"
            onClick={() => setSettingsModal({ open: true, saving: false, error: '' })}
            title="GitHub ayarları (token)"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              loadTab();
              loadStats();
            }}
            title="Yenile"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading || statsLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setRepoModal({ open: true, saving: false, error: '' })}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Repo Ekle
          </button>
        </div>
      </div>

      {/* Repo kartları — tutamaçtan sürükle-bırak ile sıralanır */}
      {repos.length > 0 || reposLoading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          onDragOver={(e) => {
            if (dragId) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            resetDrag();
          }}
        >
          {reposLoading
            ? [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-2xl bg-zinc-900/50"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))
            : repos.map((r) => (
                <RepoCard
                  key={r.id}
                  repo={r}
                  stat={stats[r.id]}
                  statLoading={statsLoading}
                  active={r.id === activeRepoId}
                  onSelect={() => setActiveRepoId(r.id)}
                  onDelete={() => setDeleteTarget(r)}
                  dragProps={cardDragProps(r)}
                  dragged={dragId === r.id}
                  dropTarget={Boolean(dragId) && dragId !== r.id && overId === r.id}
                />
              ))}
        </div>
      ) : null}

      {/* Seçili repo detayı */}
      {repos.length === 0 && !reposLoading ? (
        <div className="flex flex-col items-center rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-6 pb-14 pt-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
            <Github className="h-7 w-7 text-zinc-500" />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-zinc-200">
            Henüz takip edilen repo yok
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
            GitHub repolarını ekle; Actions, commit, issue, PR ve release
            akışlarını tek yerden izle.
          </p>
          <button
            type="button"
            onClick={() => setRepoModal({ open: true, saving: false, error: '' })}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            İlk Repoyu Ekle
          </button>
        </div>
      ) : activeRepo ? (
        <>
          {/* Seçili repo başlığı */}
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800/70 ring-1 ring-zinc-700/60">
              <Github className="h-4 w-4 text-zinc-300" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">{activeRepo.fullName}</h2>
              <p className="text-[11px] text-zinc-500">Aşağıdaki sekmeler seçili kartın detayları</p>
            </div>
            {activeRepo.htmlUrl && (
              <a
                href={activeRepo.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                GitHub'da aç
              </a>
            )}
          </div>

          {/* Sekmeler */}
          <div
            role="tablist"
            aria-label="GitHub sekmeleri"
            className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-1.5"
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = id === tab;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className={`flex min-w-[96px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-400 ring-1 ring-rose-500/20">
              {error}
            </p>
          )}
          {loading || data === null ? (
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl bg-zinc-900/50"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          ) : (
            <TabContent data={data} />
          )}
        </>
      ) : null}

      <GithubRepoModal
        open={repoModal.open}
        saving={repoModal.saving}
        error={repoModal.error}
        onSave={handleAddRepo}
        onClose={() => setRepoModal({ open: false, saving: false, error: '' })}
      />

      <GithubSettingsModal
        open={settingsModal.open}
        settings={settings}
        saving={settingsModal.saving}
        error={settingsModal.error}
        onSave={handleSaveSettings}
        onClose={() => setSettingsModal({ open: false, saving: false, error: '' })}
      />

      <ConfirmModal
        target={deleteTarget ? { type: 'githubRepo', item: deleteTarget } : null}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
