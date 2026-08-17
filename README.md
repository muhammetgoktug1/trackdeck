# Kişisel Takip Paneli

Aktif sitelerinin uptime takibi + kişisel notlar için lokal yönetim paneli.
Şimdilik login yok; MongoDB lokalde çalışır.

## Yapı

```
kisisel-takip/
├── server/   → Express + MongoDB API (port 4000)
└── client/   → React + Vite + Tailwind paneli (port 5173)
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

- Panel: http://localhost:5173
- API: http://localhost:4000

Ayrı ayrı çalıştırmak istersen: `server/` ve `client/` içinde ayrı ayrı `npm run dev`.

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
