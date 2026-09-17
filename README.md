# MetaCoach — Adaptif Sağlık & Beslenme Platformu

Kan tahlili PDF'lerini ve InBody/akıllı tartı ölçümlerini **AI ile okuyan**, giyilebilir veriyi birleştiren ve kilo/yağ değişiminden **gerçek metabolizma hızını (Dynamic TDEE) öğrenen** web platformu. Mobil uyumlu, dark/light, kart tabanlı, **kişiselleştirilebilir dashboard**.

> Bu depo, onaylı mimarinin **çalışan POC**'sidir. Uçtan uca üretim mimarisi (Node BFF + Python/FastAPI mikroservisleri, Redis/Celery, object storage) [Teknik Tasarım Dokümanı](#)nda tanımlıdır. POC, hızlı doğrulama için **tek runtime**'da (Next.js + Prisma/SQLite) koşar.

---

## ✨ POC'de neler var

| Alan | Durum |
|---|---|
| **Kimlik doğrulama** — Auth.js (Credentials + JWT), kayıt/giriş, çok kullanıcılı veri izolasyonu | ✅ |
| Kişiselleştirilebilir dashboard (sürükle-sırala + widget aç/kapat, kalıcı) | ✅ |
| Kan tahlili / InBody yükle → **AI parse** → onay → kaydet | ✅ |
| **Gerçek Claude Vision parse** (`PARSE_PROVIDER=claude`) veya deterministik mock | ✅ |
| **Mi Body Composition Scale 2** entegrasyonu (Web Bluetooth + simülatör) | ✅ |
| **Dynamic TDEE** motoru (EWMA + enerji dengesi + Katch-McArdle harmanı) | ✅ |
| Beslenme: besin arama + öğün kaydı + makro takibi | ✅ |
| Metabolizma detayı + geçmiş + yeniden hesaplama | ✅ |
| Profil (bilgiler saklanır) + Ayarlar (tema, bildirim, KVKK, cihazlar) | ✅ |
| **PWA** — service worker, offline, ana ekrana ekleme + **web push bildirim** (VAPID) | ✅ |
| Dark / light tema (sistem tercihi + manuel) | ✅ |

**Demo giriş:** `demo@example.com` / `demo1234` (seed ile oluşturulur).

**Mock (varsayılan):** OCR/AI ayrıştırma (`PARSE_PROVIDER=mock`), SQLite.
**Gerçek:** kimlik doğrulama, Claude Vision parse (anahtar ile), TDEE matematiği, Mi Scale kompozisyon hesabı, web push, tüm veri modeli ve akışlar.

---

## 🚀 Hızlı başlangıç (yerel)

**Gereksinim:** Node 20+, npm.

```bash
npm install          # bağımlılıklar + prisma generate
npm run setup        # SQLite şeması + 28 günlük örnek veri
npm run dev          # http://localhost:3000
```

Örnek kullanıcı: **Demo User** (`demo@example.com`) — 28 günlük geçmiş, Mi Scale ölçümleri, bir kan tahlili ve öğünlerle hazır.

### Komutlar

```bash
npm run dev        # geliştirme sunucusu
npm run build      # üretim derlemesi (prisma generate + next build)
npm run db:seed    # örnek veriyi yeniden yükle
npm run db:reset   # şemayı sıfırla + yeniden seed
```

---

## 🗂️ Proje yapısı

```
src/
  app/                    # Next.js App Router (sayfalar + /api route'ları)
    page.tsx              # kişiselleştirilebilir dashboard
    upload/ biometrics/ nutrition/ metabolism/ profile/ settings/
    api/                  # BFF: ingest, mi-scale, meals, metabolism, profile…
  components/             # AppShell, widget'lar, grafikler, formlar
  lib/
    tdee.ts               # ⭐ Dynamic TDEE motoru
    mi-scale.ts           # ⭐ Mi Scale BLE çözücü + kompozisyon matematiği
    mock-parser.ts        # OCR/AI ayrıştırma taklidi
    dashboard-data.ts     # dashboard veri toplayıcı
    widgets.ts            # widget kaydı & yerleşim
prisma/
  schema.prisma          # veri modeli (User, LabResult, Biometric, Meal, DailyLog…)
  seed.ts                # örnek veri üreteci
```

---

## 🔑 Ortam değişkenleri

`.env.example` dosyasını `.env`'e kopyalayın. Yerel varsayılanlar çalışır.

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Yerel: `file:./dev.db` · Üretim: Postgres URL |
| `AUTH_SECRET` | Auth.js oturum imza anahtarı (`openssl rand -base64 33`) |
| `PARSE_PROVIDER` | `mock` (varsayılan) veya `claude` |
| `ANTHROPIC_API_KEY` | Yalnızca `claude` modunda gerekir (model: `claude-opus-5`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push (`npx web-push generate-vapid-keys`) |
| `TDEE_WINDOW_DAYS` | TDEE hesap penceresi (varsayılan 21) |
| `R2_*` / `S3_*` | Object storage (Cloudflare R2 / S3). Yoksa yüklemeler `./storage`'a yazılır |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Hata takibi. DSN yoksa Sentry tamamen inert |

> **Datasource otomatik:** `DATABASE_URL` `postgres://` ile başlarsa Prisma datasource'u otomatik `postgresql`'e,
> `file:` ise `sqlite`'a ayarlanır (`scripts/set-db-provider.mjs`, `predev`/`prebuild`/`db:*` öncesi çalışır). Elle düzenleme gerekmez.

### Gerçek AI parse'ı açmak

```bash
# .env içinde:
PARSE_PROVIDER="claude"
ANTHROPIC_API_KEY="sk-ant-..."
```

Yükleme akışı dosya baytlarını gönderir; `claude` modunda `claude-opus-5` görü modeliyle
tek bir strict tool çağrısı yaparak kan tahlili/InBody değerlerini çıkarır (yoksa mock'a düşer).

---

## ☁️ Go-Live (managed dağıtım)

Onaylanan model: **managed servisler**.

| Katman | Servis |
|---|---|
| Web (Next.js) | **Vercel** (edge, preview deployment) |
| Python servisleri + worker | **Fly.io / Railway** (Docker) |
| Veritabanı | **Neon / Supabase** Postgres (yedekli, at-rest şifreli) |
| Redis (kuyruk/cache) | **Upstash** |
| Object storage (dosyalar) | **Cloudflare R2 / S3** |
| CI/CD | **GitHub Actions** (lint → test → build → migrate → deploy) |

### SQLite → Postgres geçişi

Datasource provider `DATABASE_URL`'e göre otomatik ayarlanır (elle şema düzenleme yok). Üretimde:

```bash
# 1) Managed Postgres oluştur (Neon/Supabase), DATABASE_URL'i al
export DATABASE_URL="postgresql://user:pass@host:5432/metacoach?schema=public"

# 2) Versiyonlu migrasyonları uygula (prisma/migrations — Postgres için commit'li)
npm run db:deploy      # = set-db-provider + prisma migrate deploy

# 3) (opsiyonel) örnek/başlangıç verisi
npm run db:seed
```

Yerelde Postgres yolunu denemek için: `docker compose up -d` sonra yukarıdaki `DATABASE_URL`'i `localhost:5432` ile kullanın.

> Şema Postgres-uyumlu: enum yerine `String`, liste/JSON için JSON string, `Float` kullanıldı. İstenirse native enum/JSONB'ye yükseltilebilir. İlk migrasyon `prisma/migrations/0_init` altında (14 tablo).

### Faz 4 — go-live otomasyonu (bu depoda hazır)

| Kalem | Nerede |
|---|---|
| **CI** (typecheck → lint → build + Postgres migrasyon smoke) | `.github/workflows/ci.yml` |
| **Health-check** (`/api/health`, DB ping, auth'suz) | uptime monitörü için |
| **Güvenlik başlıkları** (CSP, HSTS, X-Frame, nosniff, Referrer/Permissions-Policy) | `next.config.mjs` |
| **Sentry** (server/edge/client + global-error, DSN yoksa inert) | `sentry.*.config.ts`, `instrumentation.ts` |
| **Object storage** (R2/S3, yoksa yerel disk) | `src/lib/storage.ts` → `ingest` |
| **Vercel** (build'de `migrate deploy`, SW/manifest cache) | `vercel.json` |
| **Yerel Postgres** (migrasyon testi) | `docker-compose.yml` |

### Go-live öncesi kontrol listesi

- [x] Kimlik doğrulama (Auth.js Credentials + JWT) + oturum güvenliği · route koruması (middleware)
- [x] `PARSE_PROVIDER=claude` — gerçek Claude Vision ayrıştırma + insan onay akışı
- [x] PWA (service worker, offline, installable) + web push bildirim (VAPID)
- [x] Tıbbi sorumluluk reddi (uygulama içi)
- [x] **CI/CD** — GitHub Actions (typecheck + lint + build + Postgres migrasyon apply)
- [x] **Postgres geçiş yolu** — otomatik datasource + versiyonlu migrasyonlar + `db:deploy`
- [x] **Güvenlik başlıkları** (CSP/HSTS/…) + `/api/health` probe
- [x] **Gerçek object storage** adaptörü (R2/S3, env-gated)
- [x] **Sentry** entegrasyonu (DSN girilince aktif)
- [ ] Managed servis hesapları + secret'lar (Neon/Supabase, Vercel, R2, Sentry DSN, prod `AUTH_SECRET`/VAPID) — **hesap sahibi adımı**
- [ ] OAuth/e-posta doğrulama sağlayıcıları + şifre sıfırlama (üretim auth genişletme)
- [ ] Terra/Vital ile Apple Health / Garmin senkronu
- [ ] **KVKK/GDPR:** aydınlatma metni, VERBİS, açık rıza sürümleme, veri dışa aktarım/silme, denetim logu
- [ ] Güvenlik incelemesi (pentest) + CSP'yi nonce'a sıkılaştırma

---

## 🧮 Dynamic TDEE — nasıl çalışır

1. **Trend ağırlığı (EWMA)** — günlük tartım gürültüsü filtrelenir.
2. **Enerji dengesi** — pencere boyunca `TDEE_gözlem = ort(alım) − depolanan_enerji`.
3. **Fizyolojik önsel** — Katch-McArdle (InBody/Mi Scale yağsız kütlesinden).
4. **Bayesçi harman** — veri kalitesine göre gözlem ve önsel ağırlıklanır; güven aralığıyla döner.

Ayrıntı: [`src/lib/tdee.ts`](src/lib/tdee.ts). Üretimde bu modül Python/FastAPI "Metabolism Engine" servisine taşınır ve Kalman filtresine yükseltilebilir.

---

## ⚕️ Yasal

MetaCoach tıbbi tavsiye, tanı veya tedavi sağlamaz. Biyobelirteç yorumları ve beslenme önerileri bilgilendirme amaçlıdır; kararlar için hekiminize danışın.
