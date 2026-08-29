# Kişisel Takip Paneli

Aktif sitelerinin uptime takibi + kişisel notlar için lokal yönetim paneli.
Şimdilik login yok; MongoDB lokalde çalışır.

## Yapı

```
kisisel-takip/
├── server/   → Express + MongoDB API (port 40010)
└── client/   → React + Vite + Tailwind paneli (port 40011)
```

**Veritabanı:** `kisisel-proje` (lokal MongoDB, `server/.env` üzerinden ayarlanır)

## Çalıştırma

Ön koşul: MongoDB ayakta olmalı (`brew services start mongodb-community`).

```bash
# İlk kurulum
npm run install:all

# API + panel tek komutla (root'tan)
npm run dev
```

- Panel: http://localhost:40011
- API: http://localhost:40010

Ayrı ayrı çalıştırmak istersen: `server/` ve `client/` içinde ayrı ayrı `npm run dev`.

## Docker ile Çalıştırma (önerilen)

MongoDB + API + panel tek komutla konteynerlerde ayağa kalkar; kod
değişiklikleri bind-mount sayesinde hot-reload ile yansır (server'da
`node --watch`, panelde Vite HMR).

```bash
# Başlat (ilk seferde imajları build eder)
npm run docker        # = docker compose up --build -d

# Logları takip et
npm run docker:logs

# Durdur (veriler mongo_data volume'unda kalıcıdır)
npm run docker:down
```

- Panel: http://localhost:40011
- API: http://localhost:40010
- MongoDB konteyner içinde kalır; hosttan (Compass) erişmek istersen
  `docker-compose.yml` içindeki `mongo` ports satırının yorumunu aç.
- `docker compose down -v` volume'u da siler (tüm veri gider).

Not: Docker'daki MongoDB **boş başlar**; daha önce brew ile kurulu Mongo'da
veri varsa `mongodump`/`mongorestore` ile taşınabilir. Ayrıca brew Mongo'su
27017'yi kullanıyorsa çakışmaması için Docker Mongo'sunun portu hoste
yayınlanmaz.

## API Uçları

Listeleme uçları sayfalıdır: `?page=1&limit=20` (limit en fazla 100).
Cevap formatı: `{ data, total, page, limit, totalPages }`.

| Metot  | Yol                       | Açıklama                                  |
| ------ | ------------------------- | ----------------------------------------- |
| GET    | `/api/health`             | Servis + MongoDB durumu                   |
| GET    | `/api/overview`           | Dashboard özeti (monitör/domain/sunucu)   |
| GET    | `/api/monitors`           | Monitörleri sayfalı listele (populate'lu) |
| POST   | `/api/monitors`           | Yeni monitör (opsiyonel domain/server)    |
| GET    | `/api/monitors/:id`       | Tek monitör getir                         |
| PATCH  | `/api/monitors/:id`       | Monitörü güncelle                         |
| DELETE | `/api/monitors/:id`       | Monitörü sil                              |
| POST   | `/api/monitors/:id/check` | Anlık uptime kontrolü                     |
| GET    | `/api/monitors/:id/checks`| Kontrol geçmişi (sayfalı + özet)          |
| GET    | `/api/domains`            | Domainleri sayfalı listele                |
| POST   | `/api/domains`            | Yeni domain                               |
| PATCH  | `/api/domains/:id`        | Domaini güncelle                          |
| DELETE | `/api/domains/:id`        | Domaini sil (monitör bağları temizlenir)  |
| GET    | `/api/servers`            | Sunucuları sayfalı listele                |
| POST   | `/api/servers`            | Yeni sunucu                               |
| PATCH  | `/api/servers/:id`        | Sunucuyu güncelle                         |
| DELETE | `/api/servers/:id`        | Sunucuyu sil (monitör bağları temizlenir) |
| GET    | `/api/providers`          | Sağlayıcıları sayfalı listele             |
| POST   | `/api/providers`          | Yeni sağlayıcı (ad unique)                |
| PATCH  | `/api/providers/:id`      | Sağlayıcıyı güncelle                      |
| DELETE | `/api/providers/:id`      | Sağlayıcıyı sil (bağlar temizlenir)       |
| GET    | `/api/integrations/:type` | Entegrasyon ayarlarını getir (whatsapp/slack/discord) |
| PUT    | `/api/integrations/:type` | Ayarları kaydet (DB'de tutulur) |
| POST   | `/api/integrations/:type/test` | Gerçek test mesajı gönder |
| GET    | `/api/notes`              | Notları sayfalı listele (pinliler üstte) |
| POST   | `/api/notes`              | Yeni not                                  |
| PATCH  | `/api/notes/:id`          | Notu güncelle / sabitle                   |
| DELETE | `/api/notes/:id`          | Notu sil                                  |

### Entegrasyonlar

Üç kanal: **whatsapp**, **slack**, **discord** — her biri tek kayıt,
ayrı ayar/bildirim/şablon tercihleriyle. Aktif kanalların tümüne paralel
bildirim gider.

- **WhatsApp** (cms_api köprüsü: `POST {apiUrl}` gövde `{ session, chatId, text }`,
  header `X-Api-Key`): `apiUrl`, `apiKey`, `session`, `chatId`.
- **Slack** (Incoming Webhook): `webhookUrl` → `{ "text": ... }` gönderilir.
- **Discord** (Kanal Webhook'u): `webhookUrl` → `{ "content": ... }` gönderilir.

Ortak alanlar: `enabled`, `notifyUptime` (site düşüşü/düzelmesi),
`notifyDomains`, `domainThresholds` (örn: [45, 30, 15]). Ayarlar `.env`
yerine MongoDB'de saklanır; domain eşik tarayıcısı her kanalın kendi
eşikleriyle saatte bir çalışır, uptime bildirimleri durum değişiminde
(up→down / down→up) tetiklenir.

**Mesaj şablonları** (kanal başına, panelden düzenlenebilir, boş = varsayılan):
`templates.uptimeDown` (`{name} {url} {code} {reason} {time}`),
`templates.uptimeUp` (`{name} {url} {responseTime} {time}`),
`templates.domainExpiry` (`{name} {days} {expiresAt} {time}`),
`templates.domainExpired` (`{name} {expiresAt} {time}`).
Panelde örnek verilerle canlı önizleme vardır.

### Monitör alanları

`name`, `url`, `method` (GET/HEAD), `interval` (sn, 10–86400),
`enabled`, `notes`, `domain` (opsiyonel ID), `server` (opsiyonel ID),
`status` (up/down/paused/pending), `lastCheckedAt`, `lastResponseTime`, `lastStatusCode`.

Yeni aktif monitör eklendiğinde ilk tarama otomatik ve arka planda yapılır.
Her kontrol (manuel, ilk tarama) `checklogs` koleksiyonuna yazılır:
`monitor`, `status` (up/down), `responseTime` (ms), `statusCode`, `reason`
(hata sebebi), `checkedAt`. `GET /api/monitors/:id/checks` cevabı ayrıca
`summary` içerir: `totalChecks`, `upCount`, `uptimePercent`, `avg/min/maxResponseTime`.

### Domain alanları

`name` (örn: ornek.com), `provider` (opsiyonel sağlayıcı ID'si — İçerik
Tanımlamaları), `purchasedAt` (opsiyonel satın alma tarihi), `expiresAt`
(opsiyonel bitiş tarihi), `notes` (opsiyonel).

### Sunucu alanları

`name`, `provider` (opsiyonel sağlayıcı ID'si), `ipAddress` (opsiyonel),
`purchasedAt` (opsiyonel satın alma / kiralama başlangıcı), `notes` (opsiyonel).

### Sağlayıcı alanları

`name` (benzersiz — aynı firma iki kez eklenemez), `notes` (opsiyonel).
Domainlerin "kayıt firması" ve sunucuların "sağlayıcı" alanları bu koleksiyondan
seçilir; silinince bağlı kayıtlardaki ilişki otomatik temizlenir.

### Not alanları

`title` (zorunlu), `content` (opsiyonel, 20000 karakter), `pinned`
(listeye sabitleme — sabitlenen notlar üstte sıralanır),
`links: [{ url, label }]` (faydalı bağlantılar: repo, sayfa, döküman) ve
`attachments` (pdf/docx/görsel dosyaları, en fazla 25MB — `server/uploads`
altında saklanır, `/uploads/...` adresinden indirilir).
Ek uçlar: `POST /api/notes/:id/attachments` (multipart `file` alanı) ve
`DELETE /api/notes/:id/attachments/:attachmentId`.

## GitHub Takibi

Sidebar'daki **GitHub** menüsünden repolarını ekleyip tek yerden izleyebilirsin:
**Özet** (yıldız/fork/açık issue/son push), **Actions** (workflow çalışmaları),
**Commitler**, **Issue'lar**, **PR'lar** ve **Release'ler** sekmeleri.
Veri 60 saniyede bir sessizce tazelenir; sunucu tarafında 60 sn'lik cache ile
GitHub rate-limit'e dost erişim yapılır.

- Token **opsiyonel**: public repolar anonim izlenebilir (60 istek/sa).
  Private repolar ve 5000 istek/sa için sayfadaki ayarlar (⚙) dişlisinden
  **Personal Access Token** gir (GitHub → Settings → Developer settings →
  Personal access tokens, "repo" yetkisi yeterli). Token yalnızca sunucuda
  MongoDB'de saklanır, panele asla gönderilmez; kaydederken GitHub üzerinde
  doğrulanır.
- Repo eklerken `kullanici/repo` veya tam GitHub URL'si kabul edilir; repo
  GitHub'dan doğrulanır.

## Uptime Grafikleri

Monitör tablosunda **7 Gün** sütunu (son 7 günün uptime %'si), kontrol
geçmişi modalında ise 24 saatlik **yanıt süresi grafiği** ve status sayfası
tarzı **uptime şeridi** görünür. Grafikler bağımlılık olmadan SVG olarak
çizilir; veri `GET /api/monitors/:id/timeseries?hours=24` ucundan zaman
kovalarına bölünmüş olarak gelir (24 saate kadar 15 dk, sonrasında 1 saat
kova).

## GitHub Bildirimleri

Entegrasyonlar sayfasındaki kanallarda (WhatsApp/Slack/Discord) "GitHub
bildirimleri" bloğu açılarak **CI kırılmaları**, **yeni release'ler** ve
(yeşilleştirerek) **yeni issue'lar** bildirilebilir. Tarayıcı 5 dakikada bir
çalışır; "son görülen" run/release/issue işaretleri repoya kalıcı yazılır,
bu yüzden API yeniden başlasa bile çift bildirim gitmez. İlk tarama yalnızca
referans alır, bildirim göndermez. Mesaj şablonları diğerleri gibi
panelden düzenlenebilir (`githubCi`, `githubRelease`, `githubIssue`).

## Otomatik uptime taraması


API açık kaldığı sürece arka planda **15 saniyede bir** taranır: kontrol aralığı
(`interval`) dolmuş tüm aktif monitörler otomatik ölçülür, sonuç `CheckLog`'a
yazılır ve durum değişikliklerinde (up→down / down→up) bildirim tetiklenir.
"Şimdi kontrol et" butonu manuel tetikleme için hâlâ kullanılabilir; aynı
monitöre çift paralel ölçüm engellenir. (API kapalıyken tarama olmaz —
`npm run dev` çalışırken geçerlidir.)

## Sıradaki adımlar (fikir)

- Kontrol geçmişi ve uptime % grafiği
- Notlar / Domainler / Sunucular modülleri (sidebar'da yer hazır)
- Bildirimler (site down olduğunda)
- Login (gerektiğinde)
