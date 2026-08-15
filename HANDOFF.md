# MetaCoach — Oturum Devir Dokümanı (Handoff)

> Bu dosyayı yeni sohbete yapıştır ya da "MetaCoach HANDOFF.md'yi oku ve kaldığımız yerden devam et" de.
> Tarih: 2026-08-15 · Durum: **Faz 0–4B tamamlandı, master'da, CI yeşil, CANLI.** Neon (Frankfurt) + Vercel (Hobby) deploy edildi. Onboarding, Help FAB, AI meal photo parse eklendi.

---

## 1. Proje nedir

**MetaCoach** — web tabanlı, mobil uyumlu (PWA) "Next-Gen Adaptive Health & Nutrition" platformu.
Kan tahlili PDF'i ve InBody/akıllı tartı görsellerini **AI ile okur**, giyilebilir veriyi birleştirir,
kilo/yağ değişiminden **gerçek metabolizma hızını (Dynamic TDEE) öğrenir**. Apple-kalitesinde,
kart tabanlı, dark/light, **kullanıcının özelleştirebildiği** dashboard.

**Konum:** `/Users/emrecakmak/Projects/MetaCoach` · **GitHub:** private repo `github.com/elighter/metacoach` — **her şey `master`'da** (PR #1 merge edildi; Faz 0-4 + cila). CI yeşil (typecheck/lint/build + Postgres migrate + GitGuardian). Makine kapalıyken **Claude Code web** (claude.ai/code) ile devam edilebilir.
> Not: Bu makinede `gh` kimliği macOS keyring'de — Bash aracı git/gh komutlarını **sandbox kapalı** çalıştırmalı, yoksa auth görünmez.
**Görsel tasarım dokümanı (artifact):** https://claude.ai/code/artifact/0ea09d80-710a-4d0d-94f1-f81156dc8f4d

---

## 2. Kullanıcı (Emre) ve çalışma tarzı

- **Türkçe** yazışır ve Türkçe yanıt bekler. Teknik (architect seviyesi promptlar yazıyor).
- **Fazlı, onay kapılı** akış ister: analiz → eksik tamamlama → plan → POC → *onay* → geliştirme.
  Açık kararları uzmanlığa bırakır ("gerisini sana bırakıyorum") ama tasarım ve POC'de açık onay kapıları ister.
- Görsel/yapılandırılmış teslimatları sever (tasarım-doküman artifact'ını beğendi).

---

## 3. Kilitli kararlar (kullanıcıdan)

- **Dağıtım:** managed servisler (Vercel + Neon). Free tier ile başla.
- **POC parse:** mock ile başla; gerçek Claude Vision opsiyonel (kod hazır, anahtar gerektirir).
- **Sadece bireysel** (koç/multi-tenant yok).
- Zorunlu özellikler: **Mi Body Composition Scale 2** entegrasyonu, **kişiselleştirilebilir dashboard**
  (sürükle-sırala + widget aç/kapat), **profil** (bilgiler saklanır) + **ayarlar**.
- **Faz 3 öncelikleri (seçilen):** ① Gerçek AI parse (Claude), ② Kimlik doğrulama (Auth.js), ③ PWA + bildirim.
  **Wearable senkron (Terra/Vital) sonraya bırakıldı.**
- **Cost-optimized AI parse:** Claude Sonnet 5 varsayılan model (Opus 5'ten ~%60 ucuz, high-res vision yeterli). `CLAUDE_PARSE_MODEL` env ile override edilebilir.

---

## 4. Mimari & teknoloji

**POC = tek runtime** (hızlı çalışsın diye): Next.js 15 (App Router) + TypeScript + Tailwind v3 +
Recharts + **Prisma/SQLite**. Üretimde Postgres (Neon).

Auto datasource switching: `scripts/set-db-provider.mjs` `DATABASE_URL`'e göre provider'ı sqlite↔postgresql yapar (elle şema düzenleme yok).

Ana bağımlılıklar: next 15.1.6, react 18.3.1, prisma 6.2.1, recharts 2.15, @dnd-kit, lucide-react,
next-auth ^5.0.0-beta.25, bcryptjs, web-push, @anthropic-ai/sdk ^0.116, zod ^3.25.76, @sentry/nextjs v8.

---

## 5. Çalıştırma

```bash
cd /Users/emrecakmak/Projects/MetaCoach
npm install          # gerekirse
npm run setup        # SQLite şema + 28 günlük seed
npm run dev          # http://localhost:3000
```

**Demo giriş:** `emrecakmak@me.com` / `metacoach123`
Diğer komutlar: `npm run build`, `npm run db:seed`, `npm run db:reset`, `npm run typecheck`.

**Not:** Auth/middleware değişikliklerinden sonra dev sunucusunu **yeniden başlat** (port 3000'i öldür + `npm run dev`).

---

## 6. Dosya haritası (önemli olanlar)

```
src/
  auth.ts                     # NextAuth (Credentials + JWT) — tam config
  auth.config.ts              # edge-güvenli config (middleware kullanır)
  middleware.ts               # tüm route'ları korur (login/register/api/register public)
  app/
    layout.tsx                # ThemeProvider + AppShell + PwaRegister; auth() ile session
    page.tsx                  # Dashboard (server) → DashboardGrid
    login/ register/          # auth ekranları (client)
    upload/                   # yükle → AI parse → onay akışı (client)
    biometrics/               # Mi Scale paneli + ölçüm geçmişi
    nutrition/ metabolism/ profile/ settings/
    api/
      auth/[...nextauth]/     # NextAuth handlers
      register/               # kayıt
      ingest/ ingest/confirm/ # parse + onaylı kaydet
      mi-scale/reading/       # tartı ölçümü → kompozisyon
      foods/ meals/ meals/[id]/
      metabolism/recompute/
      profile/ settings/
      dashboard/layout/       # widget yerleşimi kaydet
      push/subscribe/ push/test/   # web push
      health/                 # DB ping, auth'suz
  components/
    app-shell.tsx             # sidebar + topbar + tema + çıkış + kullanıcı
    theme-provider.tsx        # system/light/dark, .dark class, no-flash
    dashboard/dashboard-grid.tsx  # dnd-kit sürükle-sırala + widget aç/kapat + kalıcılık
    dashboard/widgets.tsx     # tüm widget render'ları
    charts.tsx                # Recharts: WeightEnergyChart, TdeeHistoryChart, Ring, Sparkline
    mi-scale-panel.tsx        # Web Bluetooth + simülatör
    nutrition-client.tsx  profile-form.tsx  settings-form.tsx
    push-controls.tsx  pwa-register.tsx  recompute-button.tsx
  lib/
    db.ts                     # Prisma singleton + getCurrentUser (session'dan; auth'u dinamik import)
    tdee.ts                   # Dynamic TDEE motoru (EWMA + enerji dengesi + Katch-McArdle)
    mi-scale.ts               # BLE çözücü + Xiaomi kompozisyon matematiği (yaklaşım)
    mock-parser.ts            # deterministik mock parse
    claude-parser.ts          # gerçek Claude Vision (Sonnet 5 default, strict tool call)
    parser.ts                 # mock/claude dağıtıcısı (PARSE_PROVIDER) — Claude hatasında throw (sessiz fallback yok)
    push.ts                   # web-push (VAPID) sunucu tarafı
    storage.ts                # S3/R2 adaptör (env-gated, yoksa local disk fallback)
    dashboard-data.ts         # dashboard veri toplayıcı + TDEE hesaplar
    widgets.ts                # widget kaydı & varsayılan yerleşim
    meals.ts  utils.ts
prisma/schema.prisma          # User, LabResult, LabBiomarker, Biometric, Meal, DailyLog,
                              # FileAsset, DeviceConnection, Consent, FoodItem,
                              # MetabolismEstimate, DashboardLayout, Settings, PushSubscription
prisma/migrations/0_init/     # Postgres init migration (14 tablo)
prisma/seed.ts                # Emre + 28 gün geçmiş + lab + öğünler + Mi Scale ölçümleri (+bcrypt şifre)
scripts/set-db-provider.mjs   # DATABASE_URL'den provider otomatik ayar
.github/workflows/ci.yml      # typecheck + lint + build + Postgres migrate smoke
sentry.*.config.ts            # server/edge/client Sentry (DSN yoksa inert)
instrumentation.ts            # Next.js instrumentation hook
vercel.json                   # build: db:provider + migrate deploy + next build; region fra1
docker-compose.yml            # yerel Postgres 16 test
public/ manifest.webmanifest sw.js offline.html icons/
```

---

## 7. Neler tamam (Faz 0–4A) — doğrulama durumu

- **Faz 0 Tasarım** ✅ — sistem mimarisi, ERD, API, Dynamic TDEE, UI (artifact yayında).
- **Faz 1 İskele + yerel ortam** ✅ — monorepo, Prisma/SQLite, seed.
- **Faz 2 POC** ✅ (tarayıcıda doğrulandı): dashboard, Mi Scale simülasyon, TDEE motoru, beslenme, metabolizma, profil, ayarlar, dark mode. Build hatasız.
- **Faz 3** ✅: Auth.js (Credentials+JWT, middleware, login/register, bcrypt), gerçek Claude Vision parse (strict tool call, mock fallback), PWA + web push (VAPID).
- **Faz 4A (kod)** ✅: auto datasource switch, Postgres migration, CI/CD, Sentry (inert), S3/R2 storage, /api/health, güvenlik başlıkları, vercel.json.
- **UI polish** ✅: chart integer-axis fix, Upload flow Claude-ready (provider badge, hata/validation states, sessiz mock fallback kaldırıldı).
- **Cost optimization** ✅: Claude Sonnet 5 varsayılan parse model, thinking disabled, env-driven model seçimi.
- **GitHub** ✅: Private repo `github.com/elighter/metacoach`, PR #1 merged, master yeşil.
- **Faz 4B (deploy)** ✅: Neon Free (Frankfurt) + Vercel Hobby, migration deploy, health endpoint doğrulandı.
- **Onboarding** ✅: 5 adımlı wizard (ilk girişte otomatik, localStorage ile takip, Help'ten tekrar erişim).
- **Help FAB** ✅: Sağ alt köşe floating button, accordion yardım paneli, tanıtım turu tekrar açma.
- **AI meal photo parse** ✅: Tabak fotoğrafı → Claude Vision → yiyecek tanıma + kalori/makro hesaplama, onay sonrası kayıt. Mock fallback mevcut.

**Build:** 26 route + middleware, tip hatası yok, CI yeşil. **Prod:** `metacoach-git-master-elighters-projects.vercel.app`

---

## 8. Ortam değişkenleri (.env)

`.env` yerelde dolu (dev değerleriyle). Şablon: `.env.example`.
- `DATABASE_URL="file:./dev.db"` (prod: Neon Postgres URL)
- `AUTH_SECRET` (dev değeri var; prod: `openssl rand -base64 33`), `AUTH_TRUST_HOST="true"`
- `PARSE_PROVIDER="mock"` → gerçek için `"claude"` + `ANTHROPIC_API_KEY` ekle
- `CLAUDE_PARSE_MODEL="claude-sonnet-5"` (varsayılan, override edilebilir)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (dev anahtarları üretildi)
- `TDEE_WINDOW_DAYS="21"`
- Opsiyonel (prod): `R2_*`/`S3_*` (object storage), `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`

---

## 9. Önemli kararlar & tuzaklar (gotchas)

- **SQLite kısıtları:** enum yok → `String`; array/JSON yok → JSON string; Decimal yerine `Float`.
- **Apple Health web'de cloud API'sı yok** → prod'da Terra/Vital agregatörü.
- **Auth döngüsü:** `db.ts.getCurrentUser` içinde `auth`'u **dinamik import** eder (db↔auth circular'ı kırmak için).
- **Middleware** edge'de çalışır → `auth.config.ts` prisma/bcrypt import ETMEZ.
- **zodOutputFormat** Zod v4 bekliyor; biz Zod v3 → **strict tool call** yaklaşımı.
- Prisma 6.2 stabil; 7'ye dokunulmadı.
- **Vercel dosya sistemi geçici** — R2/S3 olmadan upload byte'ları saklanmaz (parse sonuçları kaydedilir, orijinal dosya kaybolur). R2 free tier (10GB) sonradan eklenebilir.
- **Claude parse hatası:** `ParseError` fırlatır (sessiz mock fallback yok) — veri bütünlüğü için kasıtlı.

---

## 10. Mevcut durum: Canlı (deploy tamamlandı)

### Alınan kararlar (2026-08-15)

| Servis | Seçim | Neden |
|---|---|---|
| **Neon** | **Free ($0)** | 0.5GB + 100 CU-hr/ay. Tek kullanıcı sağlık verisi için fazlasıyla yeter. Cold start ~1sn (kişisel kullanımda sorun değil). |
| **Vercel** | **Hobby (free)** | Kişisel proje. Next.js sıfır-config deploy. Ticari olursa Pro ($20/ay). |
| **Anthropic API** | Kullandıkça öde | Sonnet 5, parse başına birkaç sent. |
| **Domain** | **Vercel subdomain** (`.vercel.app`) başlangıçta | HTTPS dahil, $0. Custom domain isterse Cloudflare/Namecheap ~$10/yıl. |
| **R2 / Sentry** | Sonra | Bloklayıcı değil. R2 olmadan parse çalışır (orijinal dosya saklanmaz). |

**Toplam altyapı maliyeti: $0/ay** + Claude API parse başına ~birkaç sent.

### Deploy runbook (sıradaki adımlar)

1. **Neon:** Free proje oluştur → `DATABASE_URL` (direct connection string) al.
2. **Vercel:** GitHub repo'yu import et (`github.com/elighter/metacoach`).
3. **Vercel env vars** ekle:
   - `DATABASE_URL` (Neon'dan)
   - `AUTH_SECRET` (prod: `openssl rand -base64 33`)
   - `AUTH_TRUST_HOST=true`
   - `PARSE_PROVIDER=mock` (başlangıçta)
   - `NEXT_PUBLIC_APP_NAME=MetaCoach`
   - `APP_BASE_URL` (Vercel URL'i belli olduktan sonra)
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` (prod anahtarları)
   - İsteğe bağlı: `ANTHROPIC_API_KEY` + `PARSE_PROVIDER=claude` + `CLAUDE_PARSE_MODEL`
4. **Deploy tetikle** → Vercel otomatik: `db:provider` → `prisma migrate deploy` → `next build`.
5. **Doğrulama:**
   - `curl https://<app>.vercel.app/api/health` → 200 + DB bağlantısı
   - Login (demo credentials), dashboard, upload akışı test
   - Güvenlik başlıklarını kontrol (`curl -I`)

### Prod secrets (önceki oturumda üretildi, chat'te verildi)
- `AUTH_SECRET`: kullanıcı kaydetti
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: kullanıcı kaydetti

---

## 11. Sıradaki (deploy sonrası)

- **Canlı doğrulama** — health, login, dashboard, Claude Vision parse test
- **Custom domain** opsiyonel — Cloudflare/Namecheap ~$10/yıl
- **R2 object storage** — orijinal dosyaların saklanması (Cloudflare R2 free tier 10GB)
- **Sentry** — error monitoring (free tier)
- **Wearable senkron** — Terra/Vital (Apple Health + Garmin)
- **OAuth/email verify** + şifre sıfırlama
- **KVKK/GDPR** — aydınlatma metni, VERBİS, denetim logu, rıza, veri dışa aktarım/silme
- **Pentest + CSP nonce**

---

## 12. Hafıza (persistent memory)

Şurada tutuluyor: `~/.claude/projects/-Users-emrecakmak-Projects-MetaCoach/memory/`
- `metacoach-project.md` — hedefler, kilitli kararlar, faz durumu.
- `emre-workflow.md` — Türkçe, teknik, onay-kapılı çalışma tarzı.
- `MEMORY.md` — index.
