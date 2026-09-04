// GitHub REST API istemcisi: native fetch + kısa TTL'li in-memory cache.
// Token yoksa anonim erişim (public repolar, 60 ist/sa); token ile 5000 ist/sa.

const API_BASE = 'https://api.github.com';
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 200;

const cache = new Map();

export function clearGithubCache() {
  cache.clear();
}

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key, data) {
  cache.set(key, { at: Date.now(), data });
  // en eski kayıtları atarak boyutu sınırla
  while (cache.size > CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

function rateLimitError(res) {
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining === '0') {
    return new Error('GitHub API limiti doldu; token ekleyerek 5000 istek/sa elde edilir');
  }
  const reset = Number(res.headers.get('x-ratelimit-reset'));
  const wait = reset > 0 ? Math.max(0, Math.ceil((reset * 1000 - Date.now()) / 60000)) : null;
  return new Error(
    wait ? `GitHub API erişimi reddedildi (~${wait} dk sonra yeniden dene)` : 'GitHub API erişimi reddedildi'
  );
}

// GitHub'a kimlik doğrulmalı/anonim istek atar; hataları Türkçe mesajlara çevirir
// fetch öncesi savunma: path dışarıdan gelmiş olsa bile istek yalnızca
// api.github.com origin'ine gidebilir (SSRF için host kilidi)
function githubUrl(path) {
  const url = new URL(path, API_BASE);
  if (url.origin !== API_BASE) {
    throw new Error('GitHub isteği yalnızca api.github.com adresine yapılabilir');
  }
  return url;
}

export async function ghRequest(path, { token } = {}) {
  const cacheKey = `${token ? 'auth' : 'anon'}:${path}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'kisisel-takip-panel',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(githubUrl(path), { headers });
  } catch {
    throw new Error("GitHub API'ye ulaşılamadı (ağ hatası)");
  }

  if (res.status === 401) throw new Error('GitHub token geçersiz veya süresi dolmuş');
  if (res.status === 403 || res.status === 429) throw rateLimitError(res);
  if (res.status === 404) throw new Error('GitHub kaynağı bulunamadı');
  if (!res.ok) throw new Error(`GitHub API hatası (${res.status})`);

  const data = res.status === 204 ? null : await res.json();
  cacheSet(cacheKey, data);
  return data;
}

// Toplam kayıt sayısı: path per_page=1 içermeli; GitHub Link header'ındaki
// son sayfa numarası (= kayıt sayısı) esas alınır, header yoksa tek sayfa
// vardır ve gövdedeki dizinin uzunluğu döner.
export async function ghCount(path, { token } = {}) {
  const cacheKey = `count:${token ? 'auth' : 'anon'}:${path}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'kisisel-takip-panel',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(githubUrl(path), { headers });
  } catch {
    throw new Error("GitHub API'ye ulaşılamadı (ağ hatası)");
  }

  if (res.status === 401) throw new Error('GitHub token geçersiz veya süresi dolmuş');
  if (res.status === 403 || res.status === 429) throw rateLimitError(res);
  if (res.status === 404) throw new Error('GitHub kaynağı bulunamadı');
  if (!res.ok) throw new Error(`GitHub API hatası (${res.status})`);

  const lastPage = res.headers.get('link')?.match(/[?&]page=(\d+)>; rel="last"/);
  const count = lastPage ? Number(lastPage[1]) : (await res.json()).length;
  cacheSet(cacheKey, count);
  return count;
}
