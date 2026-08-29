const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `İstek başarısız (${res.status})`);
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  overview: () => request('/overview'),

  listMonitors: (page = 1, limit = 20) =>
    request(`/monitors?page=${page}&limit=${limit}`),
  getMonitor: (id) => request(`/monitors/${id}`),
  createMonitor: (body) =>
    request('/monitors', { method: 'POST', body: JSON.stringify(body) }),
  updateMonitor: (id, body) =>
    request(`/monitors/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteMonitor: (id) => request(`/monitors/${id}`, { method: 'DELETE' }),
  checkMonitor: (id) => request(`/monitors/${id}/check`, { method: 'POST' }),
  monitorChecks: (id, page = 1, limit = 10) =>
    request(`/monitors/${id}/checks?page=${page}&limit=${limit}`),
  monitorTimeseries: (id, hours = 24) =>
    request(`/monitors/${id}/timeseries?hours=${hours}`),
  monitorIncidents: (id, days = 30) =>
    request(`/monitors/${id}/incidents?days=${days}`),

  listDomains: (page = 1, limit = 20) =>
    request(`/domains?page=${page}&limit=${limit}`),
  createDomain: (body) =>
    request('/domains', { method: 'POST', body: JSON.stringify(body) }),
  updateDomain: (id, body) =>
    request(`/domains/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteDomain: (id) => request(`/domains/${id}`, { method: 'DELETE' }),

  listServers: (page = 1, limit = 20) =>
    request(`/servers?page=${page}&limit=${limit}`),
  createServer: (body) =>
    request('/servers', { method: 'POST', body: JSON.stringify(body) }),
  updateServer: (id, body) =>
    request(`/servers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteServer: (id) => request(`/servers/${id}`, { method: 'DELETE' }),

  listProviders: (page = 1, limit = 20) =>
    request(`/providers?page=${page}&limit=${limit}`),
  createProvider: (body) =>
    request('/providers', { method: 'POST', body: JSON.stringify(body) }),
  updateProvider: (id, body) =>
    request(`/providers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProvider: (id) => request(`/providers/${id}`, { method: 'DELETE' }),

  getIntegration: (type) => request(`/integrations/${type}`),
  saveIntegration: (type, body) =>
    request(`/integrations/${type}`, { method: 'PUT', body: JSON.stringify(body) }),
  testIntegration: (type) => request(`/integrations/${type}/test`, { method: 'POST' }),

  getGithubSettings: () => request('/github/settings'),
  saveGithubSettings: (token) =>
    request('/github/settings', { method: 'PUT', body: JSON.stringify({ token }) }),
  listGithubRepos: () => request('/github/repos'),
  addGithubRepo: (fullName) =>
    request('/github/repos', { method: 'POST', body: JSON.stringify({ fullName }) }),
  deleteGithubRepo: (id) => request(`/github/repos/${id}`, { method: 'DELETE' }),
  githubTabData: (id, tab, limit = 15) =>
    request(`/github/repos/${id}/${tab}?limit=${limit}`),

  listCategories: (page = 1, limit = 100) =>
    request(`/categories?page=${page}&limit=${limit}`),
  createCategory: (body) =>
    request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) =>
    request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  listNotes: (page = 1, limit = 20, category = null) =>
    request(`/notes?page=${page}&limit=${limit}${category ? `&category=${category}` : ''}`),
  createNote: (body) =>
    request('/notes', { method: 'POST', body: JSON.stringify(body) }),
  updateNote: (id, body) =>
    request(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  uploadNoteAttachment: async (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/notes/${id}/attachments`, {
      method: 'POST',
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Dosya yüklenemedi');
    return data;
  },
  deleteNoteAttachment: (id, attachmentId) =>
    request(`/notes/${id}/attachments/${attachmentId}`, { method: 'DELETE' }),
};
