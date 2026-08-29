import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, StickyNote, Tag } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import TabBar from './components/TabBar.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MonitorsPage from './pages/MonitorsPage.jsx';
import MonitorDetailPage from './pages/MonitorDetailPage.jsx';
import DomainsPage from './pages/DomainsPage.jsx';
import ServersPage from './pages/ServersPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import ProvidersPage from './pages/ProvidersPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import IntegrationPage from './pages/IntegrationPage.jsx';
import GithubPage from './pages/GithubPage.jsx';
import NotesPage from './pages/NotesPage.jsx';
import NoteModal from './components/NoteModal.jsx';
import MonitorModal from './components/MonitorModal.jsx';
import DomainModal from './components/DomainModal.jsx';
import ServerModal from './components/ServerModal.jsx';
import ProviderModal from './components/ProviderModal.jsx';
import CategoryModal from './components/CategoryModal.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';
import Toasts from './components/Toasts.jsx';
import { api } from './lib/api.js';

const REFRESH_MS = 15_000;
const DEFAULT_LIMIT = 20;

const EMPTY_LIST = { data: [], total: 0, page: 1, limit: DEFAULT_LIMIT, totalPages: 1 };

const VIEW_META = {
  dashboard: { title: 'Genel Bakış', subtitle: 'sitelerinin genel durumu', addType: 'monitor', addLabel: 'Yeni Monitör' },
  monitors: {
    title: 'Uptime Monitörleri',
    subtitle: 'sitelerinin durumunu tek yerden yönet',
    addType: 'monitor',
    addLabel: 'Yeni Monitör',
  },
  'monitor-detail': {
    title: 'Monitör Detayı',
    subtitle: 'grafikler, kesintiler ve kontrol geçmişi',
    addType: null,
    addLabel: '',
  },
  inventory: {
    title: 'Envanter',
    subtitle: 'domain ve sunucularını tek sayfadan yönet',
    addType: 'domain',
    addLabel: 'Yeni Domain',
  },
  providers: {
    title: 'Sağlayıcılar',
    subtitle: 'domain ve sunucu firmalarını merkezi tanımla',
    addType: 'provider',
    addLabel: 'Yeni Sağlayıcı',
  },
  integrations: {
    title: 'Entegrasyonlar',
    subtitle: 'bildirim kanallarını bağla ve özelleştir',
    addType: null,
    addLabel: '',
  },
  github: {
    title: 'GitHub',
    subtitle: 'repolarını, CI ve geliştirme akışını takip et',
    addType: null,
    addLabel: '',
  },
  notes: {
    title: 'Notlar',
    subtitle: 'kişisel notlarını ve kategorilerini yönet',
    addType: 'note',
    addLabel: 'Yeni Not',
  },
};

export default function App() {
  const [view, setView] = useState('dashboard');
  // Envanter sayfasının aktif sekmesi (domains | servers)
  const [inventoryTab, setInventoryTab] = useState('domains');
  // Notlar sayfasının aktif sekmesi (notes | categories)
  const [notesTab, setNotesTab] = useState('notes');
  const [apiOnline, setApiOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIds, setCheckingIds] = useState(() => new Set());

  const [overview, setOverview] = useState(null);
  const [monitorsList, setMonitorsList] = useState(EMPTY_LIST);
  const [domainsList, setDomainsList] = useState(EMPTY_LIST);
  const [serversList, setServersList] = useState(EMPTY_LIST);
  const [providersList, setProvidersList] = useState(EMPTY_LIST);
  const [categoriesList, setCategoriesList] = useState(EMPTY_LIST);
  const [notesList, setNotesList] = useState(EMPTY_LIST);
  const [listLoading, setListLoading] = useState(true);

  // Notlar sayfasının aktif kategori filtresi (null = tümü)
  const [notesCategoryFilter, setNotesCategoryFilter] = useState(null);

  // Modallardaki bağlantı seçenekleri
  const [refOptions, setRefOptions] = useState({ domains: [], servers: [], providers: [] });

  // modal: { open, type: 'monitor'|'domain'|'server', item }
  const [modal, setModal] = useState({ open: false, type: null, item: null });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // deleteTarget: { type, item }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Monitör detay sayfası (tıklanan monitör nesnesi)
  const [detailMonitor, setDetailMonitor] = useState(null);

  // Entegrasyon ayarları (aktif sekme: whatsapp / slack / discord)
  const [integrationTab, setIntegrationTab] = useState('whatsapp');
  const [integration, setIntegration] = useState({
    type: null,
    config: null,
    loading: true,
    saving: false,
    testing: false,
  });

  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const pushToast = useCallback((message, type = 'success') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Sekmeli sayfalara (envanter) doğru sekmeye, detay sayfalarına monitörle
  // atlayabilmek için
  const navigate = (nextView, tab, monitor) => {
    setView(nextView);
    if (tab) setInventoryTab(tab);
    if (monitor) setDetailMonitor(monitor);
  };

  const LIST_LOADERS = {
    monitors: { load: api.listMonitors, set: setMonitorsList },
    domains: { load: api.listDomains, set: setDomainsList },
    servers: { load: api.listServers, set: setServersList },
    providers: { load: api.listProviders, set: setProvidersList },
    categories: { load: api.listCategories, set: setCategoriesList },
    notes: {
      load: (page, limit) => api.listNotes(page, limit, notesCategoryFilter),
      set: setNotesList,
    },
  };

  const loadOverview = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setRefreshing(true);
      try {
        setOverview(await api.overview());
        setApiOnline(true);
      } catch {
        setApiOnline(false);
        if (!silent) pushToast('Veriler yüklenemedi, API çalışıyor mu?', 'error');
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [pushToast]
  );

  const loadList = useCallback(
    async (kind, page, limit, { silent = false } = {}) => {
      if (!silent) setRefreshing(true);
      try {
        const res = await LIST_LOADERS[kind].load(page, limit);
        // Silme sonrası sayfa boşaldıysa önceki sayfaya dön
        if (res.data.length === 0 && res.page > 1) {
          await loadList(kind, res.page - 1, limit, { silent });
          return;
        }
        LIST_LOADERS[kind].set(res);
        setApiOnline(true);
      } catch {
        setApiOnline(false);
        if (!silent) pushToast('Veriler yüklenemedi', 'error');
      } finally {
        setListLoading(false);
        if (!silent) setRefreshing(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [pushToast]
  );

  const loadIntegration = useCallback(
    async (type) => {
      setIntegration((prev) => ({ ...prev, type, loading: true }));
      try {
        const config = await api.getIntegration(type);
        setIntegration({ type, config, loading: false, saving: false, testing: false });
        setApiOnline(true);
      } catch {
        setIntegration((prev) => ({ ...prev, loading: false }));
        setApiOnline(false);
        pushToast('Entegrasyon ayarları yüklenemedi', 'error');
      }
    },
    [pushToast]
  );

  // Aktif görünüme göre yükleme
  useEffect(() => {
    setListLoading(true);
    if (view === 'dashboard') {
      loadOverview();
    } else if (view === 'github' || view === 'monitor-detail') {
      // bu sayfalar verilerini kendileri yükler
      setListLoading(false);
    } else if (view === 'integrations') {
      loadIntegration(integrationTab);
    } else if (view === 'inventory') {
      loadList(inventoryTab, 1, DEFAULT_LIMIT);
    } else if (view === 'notes') {
      if (notesTab === 'categories') {
        loadList('categories', 1, DEFAULT_LIMIT);
      } else {
        loadList('notes', 1, DEFAULT_LIMIT);
        // filtre çipleri için kategoriler (modal seçenekleriyle aynı kaynak)
        api
          .listCategories(1, 100)
          .then((r) => setRefOptions((p) => ({ ...p, categories: r.data })))
          .catch(() => {});
      }
    } else {
      loadList(view, 1, DEFAULT_LIMIT);
    }
  }, [view, integrationTab, inventoryTab, notesTab, loadOverview, loadList, loadIntegration]);

  // Notlar sayfasında kategori filtresi değişince listeyi yeniden yükle
  useEffect(() => {
    if (view === 'notes') {
      setListLoading(true);
      loadList('notes', 1, DEFAULT_LIMIT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesCategoryFilter]);

  // Otomatik yenileme: aktif görünümün verisi (entegrasyon formunu bozmamak için hariç)
  useEffect(() => {
    const timer = setInterval(() => {
      if (view === 'dashboard') {
        loadOverview({ silent: true });
      } else if (view === 'integrations' || view === 'github' || view === 'monitor-detail') {
        return;
      } else {
        const kind =
          view === 'inventory'
            ? inventoryTab
            : view === 'notes' && notesTab === 'categories'
              ? 'categories'
              : view;
        const list = {
          monitors: monitorsList,
          domains: domainsList,
          servers: serversList,
          providers: providersList,
          categories: categoriesList,
          notes: notesList,
        }[kind];
        if (list) loadList(kind, list.page, list.limit, { silent: true });
      }
    }, REFRESH_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, inventoryTab, monitorsList.page, monitorsList.limit, domainsList.page, domainsList.limit, serversList.page, serversList.limit, providersList.page, providersList.limit, loadOverview, loadList]);

  const refreshCurrent = () => {
    if (view === 'dashboard') {
      loadOverview();
      return;
    }
    if (view === 'github' || view === 'monitor-detail') {
      // bu sayfalar kendi yenileme düğmesine sahip
      return;
    }
    if (view === 'integrations') {
      loadIntegration(integrationTab);
      return;
    }
    const kind =
      view === 'inventory'
        ? inventoryTab
        : view === 'notes' && notesTab === 'categories'
          ? 'categories'
          : view;
    const list = {
      monitors: monitorsList,
      domains: domainsList,
      servers: serversList,
      providers: providersList,
      categories: categoriesList,
      notes: notesList,
    }[kind];
    loadList(kind, list.page, list.limit);
  };

  // Her değişiklikte overview'ı da tazele (kartlar tutarlı kalsın)
  const refreshAfterMutation = () => {
    refreshCurrent();
    loadOverview({ silent: true });
  };

  const loadRefOptions = async (type) => {
    try {
      if (type === 'monitor') {
        const [domains, servers] = await Promise.all([
          api.listDomains(1, 100),
          api.listServers(1, 100),
        ]);
        setRefOptions((prev) => ({ ...prev, domains: domains.data, servers: servers.data }));
      } else if (type === 'domain' || type === 'server') {
        const providers = await api.listProviders(1, 100);
        setRefOptions((prev) => ({ ...prev, providers: providers.data }));
      } else if (type === 'note') {
        const categories = await api.listCategories(1, 100);
        setRefOptions((prev) => ({ ...prev, categories: categories.data }));
      }
    } catch {
      // seçenekler yüklenemezse boş select ile devam
    }
  };

  const handleIntegrationSave = async (form) => {
    const type = integration.type;
    setIntegration((prev) => ({ ...prev, saving: true }));
    try {
      const config = await api.saveIntegration(type, form);
      setIntegration((prev) => ({ ...prev, config, saving: false }));
      pushToast('Entegrasyon ayarları kaydedildi');
    } catch (err) {
      setIntegration((prev) => ({ ...prev, saving: false }));
      pushToast(err.message, 'error');
    }
  };

  // Test akışı: önce formdaki ayarları kaydeder, sonra gerçek test mesajı atar
  const handleIntegrationTest = async (form) => {
    const type = integration.type;
    setIntegration((prev) => ({ ...prev, testing: true, saving: true }));
    try {
      const config = await api.saveIntegration(type, form);
      setIntegration((prev) => ({ ...prev, config }));
    } catch (err) {
      setIntegration((prev) => ({ ...prev, testing: false, saving: false }));
      pushToast(`Ayarlar kaydedilemedi: ${err.message}`, 'error');
      return;
    }
    try {
      const res = await api.testIntegration(type);
      pushToast(res.message);
    } catch (err) {
      pushToast(err.message, 'error');
    }
    const config = await api.getIntegration(type).catch(() => null);
    setIntegration({ type, config, loading: false, saving: false, testing: false });
  };

  const handleTogglePin = async (note) => {
    try {
      await api.updateNote(note.id, { pinned: !note.pinned });
      refreshCurrent();
      loadOverview({ silent: true });
    } catch (err) {
      pushToast(err.message, 'error');
    }
  };

  // Not kaydetme: forma ek olarak seçilen dosyaları yükler
  const handleNoteSave = async (form, pendingFiles = []) => {
    setSaving(true);
    setFormError('');
    try {
      let note;
      if (modal.item) {
        note = await api.updateNote(modal.item.id, form);
      } else {
        note = await api.createNote(form);
      }
      for (const file of pendingFiles) {
        await api.uploadNoteAttachment(note.id, file);
      }
      pushToast(`"${note.title}" ${modal.item ? 'güncellendi' : 'eklendi'}`);
      setModal({ open: false, type: null, item: null });
      refreshCurrent();
      loadOverview({ silent: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = async (type) => {
    setFormError('');
    await loadRefOptions(type);
    setModal({ open: true, type, item: null });
  };

  const openEditModal = async (type, item) => {
    setFormError('');
    await loadRefOptions(type);
    setModal({ open: true, type, item });
  };

  // Monitör detay sayfasını açar (liste satırından veya geçmiş ikonundan)
  const openMonitorDetail = (monitor) => {
    setDetailMonitor(monitor);
    setView('monitor-detail');
  };

  const handleSave = async (form) => {
    setSaving(true);
    setFormError('');
    const { type, item } = modal;
    const actions = {
      monitor: { create: api.createMonitor, update: api.updateMonitor, label: 'Monitör' },
      domain: { create: api.createDomain, update: api.updateDomain, label: 'Domain' },
      server: { create: api.createServer, update: api.updateServer, label: 'Sunucu' },
      provider: { create: api.createProvider, update: api.updateProvider, label: 'Sağlayıcı' },
      category: { create: api.createCategory, update: api.updateCategory, label: 'Kategori' },
      note: { create: api.createNote, update: api.updateNote, label: 'Not' },
    };
    try {
      if (item) {
        const updated = await actions[type].update(item.id, form);
        pushToast(`"${updated.name}" güncellendi`);
      } else {
        const created = await actions[type].create(form);
        if (type === 'monitor' && created.enabled) {
          pushToast(`"${created.name}" eklendi · ilk tarama yapılıyor`);
          // İlk tarama arka planda koşar; birkaç saniye sonra listeyi tazele
          setTimeout(() => refreshCurrent(), 3000);
        } else {
          pushToast(`"${created.name}" eklendi`);
        }
      }
      setModal({ open: false, type: null, item: null });
      refreshAfterMutation();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCheck = async (monitor) => {
    setCheckingIds((prev) => new Set(prev).add(monitor.id));
    try {
      const updated = await api.checkMonitor(monitor.id);
      setMonitorsList((prev) => ({
        ...prev,
        data: prev.data.map((m) => (m.id === updated.id ? updated : m)),
      }));
      if (updated.status === 'up') {
        pushToast(`"${updated.name}" erişilebilir (${updated.lastStatusCode})`);
      } else {
        pushToast(`"${updated.name}" kontrolü başarısız`, 'error');
      }
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(monitor.id);
        return next;
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const actions = {
      monitor: api.deleteMonitor,
      domain: api.deleteDomain,
      server: api.deleteServer,
      provider: api.deleteProvider,
      category: api.deleteCategory,
      note: api.deleteNote,
    };
    try {
      await actions[deleteTarget.type](deleteTarget.item.id);
      pushToast(`"${deleteTarget.item.name}" silindi`);
      setDeleteTarget(null);
      // detay sayfasındayken silinen monitörün sayfasında kalma
      if (view === 'monitor-detail') setView('monitors');
      refreshAfterMutation();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Envanterde üst bardaki ekleme butonu aktif sekmeye göre değişir
  const meta =
    view === 'inventory'
      ? {
          ...VIEW_META.inventory,
          addType: inventoryTab === 'domains' ? 'domain' : 'server',
          addLabel: inventoryTab === 'domains' ? 'Yeni Domain' : 'Yeni Sunucu',
        }
      : view === 'notes' && notesTab === 'categories'
        ? {
            ...VIEW_META.notes,
            addType: 'category',
            addLabel: 'Yeni Kategori',
          }
        : VIEW_META[view];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar view={view} onNavigate={navigate} apiOnline={apiOnline} />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Üst bar */}
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-6 py-4 lg:px-8">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                {meta.title}
              </h1>
              <p className="mt-0.5 text-[13px] text-zinc-500">{meta.subtitle}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={refreshCurrent}
                title="Yenile"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
              </button>
              {meta.addType && (
                <button
                  type="button"
                  onClick={() => openAddModal(meta.addType)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{meta.addLabel}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* İçerik */}
        <div className="flex flex-1 flex-col gap-5 px-6 py-6 lg:px-8">
          {view === 'dashboard' && (
            <DashboardPage stats={overview} onNavigate={navigate} />
          )}

          {view === 'monitors' && (
            <MonitorsPage
              list={monitorsList}
              loading={listLoading}
              checkingIds={checkingIds}
              onPageChange={(page) => loadList('monitors', page, monitorsList.limit)}
              onLimitChange={(limit) => loadList('monitors', 1, limit)}
              onCheck={handleCheck}
              onEdit={(item) => openEditModal('monitor', item)}
              onDelete={(item) => setDeleteTarget({ type: 'monitor', item })}
              onDetail={openMonitorDetail}
              onAdd={() => openAddModal('monitor')}
            />
          )}

          {view === 'monitor-detail' && detailMonitor && (
            <MonitorDetailPage
              monitor={detailMonitor}
              onBack={() => setView('monitors')}
              onEdit={(item) => openEditModal('monitor', item)}
              onDelete={(item) => setDeleteTarget({ type: 'monitor', item })}
            />
          )}

          {view === 'inventory' && (
            <InventoryPage
              activeTab={inventoryTab}
              onTabChange={setInventoryTab}
              totals={{ domains: domainsList.total, servers: serversList.total }}
            >
              {inventoryTab === 'domains' ? (
                <DomainsPage
                  list={domainsList}
                  loading={listLoading}
                  onPageChange={(page) => loadList('domains', page, domainsList.limit)}
                  onLimitChange={(limit) => loadList('domains', 1, limit)}
                  onEdit={(item) => openEditModal('domain', item)}
                  onDelete={(item) => setDeleteTarget({ type: 'domain', item })}
                  onAdd={() => openAddModal('domain')}
                />
              ) : (
                <ServersPage
                  list={serversList}
                  loading={listLoading}
                  onPageChange={(page) => loadList('servers', page, serversList.limit)}
                  onLimitChange={(limit) => loadList('servers', 1, limit)}
                  onEdit={(item) => openEditModal('server', item)}
                  onDelete={(item) => setDeleteTarget({ type: 'server', item })}
                  onAdd={() => openAddModal('server')}
                />
              )}
            </InventoryPage>
          )}

          {view === 'providers' && (
            <ProvidersPage
              list={providersList}
              loading={listLoading}
              onPageChange={(page) => loadList('providers', page, providersList.limit)}
              onLimitChange={(limit) => loadList('providers', 1, limit)}
              onEdit={(item) => openEditModal('provider', item)}
              onDelete={(item) => setDeleteTarget({ type: 'provider', item })}
              onAdd={() => openAddModal('provider')}
            />
          )}

          {view === 'notes' && (
            <div className="flex flex-col gap-5">
              <TabBar
                ariaLabel="Notlar sekmeleri"
                active={notesTab}
                onChange={setNotesTab}
                totals={{ notes: notesList.total, categories: categoriesList.total }}
                tabs={[
                  { id: 'notes', label: 'Notlar', icon: StickyNote },
                  { id: 'categories', label: 'Kategoriler', icon: Tag },
                ]}
              />
              {notesTab === 'notes' ? (
                <NotesPage
                  list={notesList}
                  loading={listLoading}
                  categories={refOptions.categories}
                  activeCategory={notesCategoryFilter}
                  onCategoryChange={setNotesCategoryFilter}
                  onPageChange={(page) => loadList('notes', page, notesList.limit)}
                  onLimitChange={(limit) => loadList('notes', 1, limit)}
                  onEdit={(item) => openEditModal('note', item)}
                  onDelete={(item) => setDeleteTarget({ type: 'note', item })}
                  onTogglePin={handleTogglePin}
                  onAdd={() => openAddModal('note')}
                />
              ) : (
                <CategoriesPage
                  list={categoriesList}
                  loading={listLoading}
                  onPageChange={(page) => loadList('categories', page, categoriesList.limit)}
                  onLimitChange={(limit) => loadList('categories', 1, limit)}
                  onEdit={(item) => openEditModal('category', item)}
                  onDelete={(item) => setDeleteTarget({ type: 'category', item })}
                  onAdd={() => openAddModal('category')}
                />
              )}
            </div>
          )}

          {view === 'github' && <GithubPage />}

          {view === 'integrations' && (
            <IntegrationPage
              type={integrationTab}
              onTabChange={setIntegrationTab}
              config={integration.type === integrationTab ? integration.config : null}
              loading={integration.type !== integrationTab || integration.loading}
              saving={integration.saving}
              testing={integration.testing}
              onSave={handleIntegrationSave}
              onTest={handleIntegrationTest}
            />
          )}

          <p className="pb-2 text-center text-xs text-zinc-700">
            Veriler {REFRESH_MS / 1000} saniyede bir otomatik yenilenir
          </p>
        </div>
      </main>

      <MonitorModal
        open={modal.open && modal.type === 'monitor'}
        monitor={modal.item}
        saving={saving}
        error={formError}
        domainOptions={refOptions.domains}
        serverOptions={refOptions.servers}
        onSave={handleSave}
        onClose={() => setModal({ open: false, type: null, item: null })}
      />

      <DomainModal
        open={modal.open && modal.type === 'domain'}
        domain={modal.item}
        saving={saving}
        error={formError}
        providerOptions={refOptions.providers}
        onSave={handleSave}
        onClose={() => setModal({ open: false, type: null, item: null })}
      />

      <ServerModal
        open={modal.open && modal.type === 'server'}
        server={modal.item}
        saving={saving}
        error={formError}
        providerOptions={refOptions.providers}
        onSave={handleSave}
        onClose={() => setModal({ open: false, type: null, item: null })}
      />

      <ProviderModal
        open={modal.open && modal.type === 'provider'}
        provider={modal.item}
        saving={saving}
        error={formError}
        onSave={handleSave}
        onClose={() => setModal({ open: false, type: null, item: null })}
      />

      <NoteModal
        open={modal.open && modal.type === 'note'}
        note={modal.item}
        saving={saving}
        error={formError}
        categoryOptions={refOptions.categories}
        onSave={handleNoteSave}
        onAttachmentDeleted={() => loadList('notes', notesList.page, notesList.limit, { silent: true })}
        onClose={() => setModal({ open: false, type: null, item: null })}
      />

      <CategoryModal
        open={modal.open && modal.type === 'category'}
        category={modal.item}
        saving={saving}
        error={formError}
        onSave={handleSave}
        onClose={() => setModal({ open: false, type: null, item: null })}
      />

      <ConfirmModal
        target={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <Toasts toasts={toasts} />
    </div>
  );
}
