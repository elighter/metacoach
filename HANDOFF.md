# MetaCoach — Oturum Devir Dokümanı (Handoff)

> Bu dosyayı yeni sohbete yapıştır ya da "MetaCoach HANDOFF.md'yi oku ve kaldığımız yerden devam et" de.
> Tarih: 2026-08-25 · Durum: **Faz 0–4B tamamlandı, master'da, CI yeşil, CANLI.** Neon (Frankfurt) + Vercel (Hobby) deploy edildi. Onboarding, Help FAB, AI meal photo parse, Antrenman modülü, Ön Değerlendirme (`/assessment`) + galeri fix'i (PR #2/#3 master'da). **Son (branch'te, merge bekliyor):** Wearable aktivite otomasyonu — Apple Health/Technogym → webhook (`/api/ingest/health`) → DailyLog/WorkoutSession + otomatik activityBase kalibrasyonu. Manuel antrenman girişini ortadan kaldırır.

---

## 1. Proje nedir

**MetaCoach** — web tabanlı, mobil uyumlu (PWA) "Next-Gen Adaptive Health & Nutrition" platformu.
Kan tahlili PDF'i ve InBody/akıllı tartı görsellerini **AI ile okur**, giyilebilir veriyi birleştirir,
kilo/yağ değişiminden **gerçek metabolizma hızını (Dynamic TDEE) öğrenir**. Apple-kalitesinde,
kart tabanlı, dark/light, **kullanıcının özelleştirebildiği** dashboard.

**Konum:** `/Users/emrecakmak/Projects/MetaCoach` · **GitHub:** private repo `github.com/elighter/metacoach` — **her şey `master`'da**. CI yeşil (typecheck/lint/build + Postgres migrate + GitGuardian). Makine kapalıyken **Claude Code web** (claude.ai/code) ile devam edilebilir.
**Prod URL:** `https://metacoach-three.vercel.app` · **Neon:** Frankfurt (eu-central-1)
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

Ana bağımlılıklar: next 15.5.23, react 18.3.1, prisma 6.2.1, recharts 2.15, @dnd-kit, lucide-react,
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
    nutrition/ metabolism/ profile/ settings/ workout/
    assessment/               # Ön Değerlendirme (antrenör görüşmesi öncesi intake) — server + form
    api/
      auth/[...nextauth]/     # NextAuth handlers
      register/               # kayıt
      ingest/ ingest/confirm/ # parse + onaylı kaydet
      mi-scale/reading/       # tartı ölçümü → kompozisyon
      foods/ meals/ meals/[id]/ meals/parse/
      metabolism/recompute/
      profile/ settings/
      dashboard/layout/       # widget yerleşimi kaydet
      workouts/generate/ workouts/session/[id]/ workouts/set/[id]/  # antrenman
      assessment/             # ön değerlendirme upsert (POST, zod, taslak/gönder)
      ingest/health/          # wearable webhook (Bearer token, session'sız)
      settings/health-token/  # ingest token (yeniden) üret (session korumalı)
      push/subscribe/ push/test/   # web push
      health/                 # DB ping, auth'suz
  components/
    app-shell.tsx             # sidebar + topbar + tema + çıkış + kullanıcı
    theme-provider.tsx        # system/light/dark, .dark class, no-flash
    dashboard/dashboard-grid.tsx  # dnd-kit sürükle-sırala + widget aç/kapat + kalıcılık
    dashboard/widgets.tsx     # tüm widget render'ları
    charts.tsx                # Recharts: WeightEnergyChart, TdeeHistoryChart, Ring, Sparkline
    mi-scale-panel.tsx        # Web Bluetooth + simülatör
    onboarding.tsx            # 5 adımlı wizard (localStorage ile ilk giriş takibi)
    help-fab.tsx              # sağ alt köşe floating yardım butonu + accordion panel
    nutrition-client.tsx      # öğün listesi + fotoğraf AI parse (kamera+galeri ayrı input) + manuel arama
    workout-client.tsx        # /workout etkileşimi
    assessment-client.tsx     # ön değerlendirme 3-bölümlü form + hazırlık göstergesi
    profile-form.tsx  settings-form.tsx
    push-controls.tsx  pwa-register.tsx  recompute-button.tsx
  lib/
    db.ts                     # Prisma singleton + getCurrentUser (session'dan; auth'u dinamik import)
    tdee.ts                   # Dynamic TDEE motoru (EWMA + enerji dengesi + Katch-McArdle)
    mi-scale.ts               # BLE çözücü + Xiaomi kompozisyon matematiği (yaklaşım)
    mock-parser.ts            # deterministik mock parse
    claude-parser.ts          # gerçek Claude Vision (Sonnet 5 default, strict tool call) — lab, inbody, meal photo
    parser.ts                 # mock/claude dağıtıcısı (PARSE_PROVIDER) — Claude hatasında throw (sessiz fallback yok)
    push.ts                   # web-push (VAPID) sunucu tarafı
    storage.ts                # S3/R2 adaptör (env-gated, yoksa local disk fallback)
    dashboard-data.ts         # dashboard veri toplayıcı + TDEE hesaplar
    widgets.ts                # widget kaydı & varsayılan yerleşim
    meals.ts  utils.ts
    assessment.ts               # ön değerlendirme: etiketler, hazırlık skoru, lab referans aralıkları (server+client paylaşır)
    health-import.ts            # wearable adaptörü: HAE/generic JSON → normalize → DailyLog/WorkoutSession (oto-tamamlama+dedupe)
    activity-calibration.ts     # aktif kalori/adım → activityBase kalibrasyonu (activityAuto ile)
    workout-library.ts          # 34 egzersizlik salon kütüphanesi (saf veri, faz etiketli) — seed+app paylaşır
    workout.ts                  # şablon program üretici + kcal tahmini + adaptif protein
    workout-ai.ts               # Claude program üretici (strict tool call) + aiConfigured()
    workout-service.ts          # regenerateProgram: plan (AI/şablon) → WorkoutProgram+Session+Set kaydı
prisma/schema.prisma          # User, LabResult, LabBiomarker, Biometric, Meal, DailyLog,
                              # FileAsset, DeviceConnection, Consent, FoodItem,
                              # MetabolismEstimate, DashboardLayout, Settings, PushSubscription,
                              # Exercise, WorkoutProgram, WorkoutSession(+source), WorkoutSet,
                              # CoachAssessment, HealthIngestToken; User(+activityAuto)
prisma/migrations/0_init/     # Postgres init migration (14 tablo)
prisma/migrations/20260825110158_add_workout_module/   # antrenman tabloları
prisma/migrations/20260825120000_add_coach_assessment/ # CoachAssessment tablosu
prisma/migrations/20260825130000_add_health_ingest/    # HealthIngestToken + activityAuto + WorkoutSession.source
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

## 7. Neler tamam (Faz 0–4B) — doğrulama durumu

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
- **Ön-lansman Sprint 1 (UX cilası)** ✅ (2026-08-26, branch'te — build/lint/tsc temiz): ① **Menü sadeleştirildi** — birincil (Dashboard/Beslenme/Antrenman/Biyometri) + "Hesap" grubu (Metabolizma/Yükle/Ön Değerlendirme/Profil/Ayarlar) `app-shell.tsx`. ② **Dashboard yerleşimi** — widget span'leri 1/2/4'e normalize edildi (3 kaldırıldı, grafik tam genişlik), kartlara `h-full` (satır yükseklikleri eşit) → boşluk/hizalama düzeldi. ③ **Gün bazlı kalori** — Dashboard'a `weeklyBalance` widget'ı (alınan bar vs TDEE çizgisi, `CalorieBalanceChart`); Beslenme sayfasına **son 14 günün gün-gün geçmişi** (açılır kart, günlük toplam + öğünler). Karar: kullanıcı testi öncesi Sprint 1 = madde 1-2-3; **Sprint 2 = koç/PT rolü** (hafif MVP: koç girişi + plan/yorum + modül izinleri) — henüz başlanmadı.
- **Wearable aktivite otomasyonu** ✅ (2026-08-26, PR #4/#5/#6 master'da, **prod'da uçtan uca doğrulandı**: Health Auto Export → webhook `ok:true`, activityBase kalibre oldu; adaptör gerçek HAE şemasına göre düzeltildi — kJ→kcal, saniye→dk, TR workout tipleri): Manuel antrenman girişi TDEE'yi beslemiyordu (yüksek efor/sıfır fayda) → çözüm: aktiviteyi otomatik akıt. **Karar:** Apple Health tek toplama merkezi (Watch + Technogym oraya senkron), oradan push webhook. **Mimari:** `HealthIngestToken` (kullanıcı başına gizli token) → `POST /api/ingest/health` (Bearer token, session'sız, `PUBLIC_PREFIXES`'te) → `lib/health-import.ts` adaptörü (Health Auto Export JSON + generic/Kısayol biçimi, biçim-toleranslı) → `DailyLog.activeKcal/steps` upsert + `WorkoutSession(source="imported", completed)`; o güne planlı seans varsa onu oto-tamamlar (elle set işaretleme biter). `lib/activity-calibration.ts` son 28 günün aktif kalori/adımından `activityBase`'i otomatik türetir (`User.activityAuto` ile override edilebilir); **yakılan kalori TDEE'ye/hedefe EKLENMEZ** (çift sayma yok). Ayarlar'da "Apple Health & Aktivite" kartı: webhook URL + token + kurulum adımları + yenile. Adaptör fixture testi geçti (HAE + generic). **Not:** Apple tam export'u (`dışa aktarılan.xml`) 671 MB — webhook'a uygun değil; sadece nadir/yerel geçmiş dolgusu (henüz yok). Kullanıcının iOS tarafını (Health Auto Export app veya Kısayol) kurması gerekiyor; gerçek payload ile alan eşlemesi son kez teyit edilecek. `source` alanı `WorkoutSession`'a eklendi.
- **Ön Değerlendirme modülü** ✅ (2026-08-25, PR #2 master'a merge — build/lint/typecheck temiz; **prod doğrulaması kullanıcıda**): Antrenör/diyetisyen görüşmesi öncesi 3-bölümlük intake — ① son 2-3 günlük yemek alışkanlıkları (serbest metin), ② kişisel rutin (uyanış/uyku saati + hareket seviyesi), ③ son kan tahlilleri varsa (B12, D vit, açlık insülini, HOMA-IR, TSH → referans aralığına göre düşük/normal/yüksek rozet). `/assessment` sayfası + hazırlık göstergeli form (taslak kaydet / görüşmeye gönder), `CoachAssessment` modeli (kullanıcı başına tek kayıt, upsert), `POST /api/assessment`, nav girişi, demo seed. **Not:** kendini-değerlendirme aracı; referans aralıkları bilgi amaçlı, tanı değil.
- **Fix: öğün fotoğrafı galeriden yükleme** ✅ (2026-08-25, PR #2): `nutrition-client.tsx` tek `<input capture="environment">` kullanıyordu → mobil tarayıcıyı kameraya zorlayıp galeriyi engelliyordu. Kamera (capture'lı) + galeri (capture'sız) için ayrı input ve "Fotoğraf çek" / "Galeriden yükle" iki buton. (Masaüstünde zaten seçici açılıyordu; asıl etki mobilde.)
- **Antrenman modülü** ✅ (2026-08-25, tarayıcıda doğrulandı): 4 fazlı periyodizasyon (hazırlık→ana yüklenme→kardiyo→soğuma), 3 gün A/B split (A=kuvvet, B=fonksiyonel). Claude ile kişiye özel program üretimi (strict tool call) + deterministik şablon fallback. 34 egzersizlik salon kütüphanesi. `/workout` sayfası (4 faz akordeonu, set işaretle/ağırlık logla, seansı tamamla), dashboard `nextWorkout` widget'ı, "Antrenman" nav. Adaptif antrenman-günü protein artışı. **Kritik karar:** tahmini yakılan kalori sadece gösterim — Dynamic TDEE'ye BESLENMEZ (çift sayım önlenir; TDEE zaten toplam harcamayı kilo/alım'dan öğreniyor). estKcal doğrulandı (519 kcal / 59 dk).

**Build:** 30+ route + middleware (workout + assessment dahil), tip hatası yok, `npm run build` temiz. **Prod:** `metacoach-three.vercel.app`

---

## 8. Ortam değişkenleri (.env)

`.env` yerelde dolu (dev değerleriyle). Şablon: `.env.example`.
- `DATABASE_URL="file:./dev.db"` (prod: Neon Postgres URL)
- `AUTH_SECRET` (dev değeri var; prod: `openssl rand -base64 33`), `AUTH_TRUST_HOST="true"`
- `PARSE_PROVIDER="claude"` (prod'da aktif) + `ANTHROPIC_API_KEY` (yerelde `"mock"`)
- `CLAUDE_PARSE_MODEL="claude-sonnet-5"` (varsayılan, override edilebilir)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (prod anahtarları Vercel'de)
- `TDEE_WINDOW_DAYS="21"` · `NEXT_PUBLIC_APP_NAME="MetaCoach"`
- `APP_BASE_URL` (prod: `https://metacoach-three.vercel.app`)
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

### Deploy durumu (tamamlandı 2026-08-15)

- **Neon:** `ep-ancient-frog-b2q1sk3n.c-6.eu-central-1.aws.neon.tech/neondb` (Frankfurt, Free)
- **Vercel:** `metacoach-three.vercel.app` (Hobby, auto-deploy on push to master)
- **Deployment Protection:** kapalı (prod public, auth kendi login ekranımızda)
- **CI/CD:** `git push origin master` → Vercel otomatik build (`db:provider` → `prisma migrate deploy` → `next build`)
- **Env vars:** 12 adet Vercel'de (DATABASE_URL, AUTH_SECRET, AUTH_TRUST_HOST, PARSE_PROVIDER=claude, ANTHROPIC_API_KEY, CLAUDE_PARSE_MODEL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, TDEE_WINDOW_DAYS, NEXT_PUBLIC_APP_NAME, APP_BASE_URL)

### Doğrulanmış (prod'da)
- `/api/health` → 200, DB up, latency 3ms ✅
- Login + dashboard + seed verisi ✅
- Claude Vision parse (kan tahlili PDF + InBody görsel) ✅
- Onboarding wizard + Help FAB ✅
- AI meal photo parse (Beslenme sayfası) ✅
- Güvenlik başlıkları (CSP, HSTS, X-Frame-Options) ✅
- Next.js 15.5.23 (CVE-2025-66478 fix) ✅

### ⏳ Prod doğrulaması bekleyen (2026-08-25, PR #2 merge sonrası)
- **Ön Değerlendirme (`/assessment`)** — merge edildi, Vercel deploy tetiklendi; canlıda kullanıcı doğrulaması bekleniyor.
- **Öğün fotoğrafı galeriden yükleme** — aynı deploy. Kullanıcı ilk kontrolde "durum aynı" dedi; bunun nedeni değişikliğin o an sadece feature dalında olmasıydı (master'a merge edilmemişti). PR #2 ile master'a alındı. Mobilde hâlâ eskiyse **PWA/service-worker cache** şüphesi — hard-refresh / uygulamayı kapat-aç.
- **Migration:** `20260825120000_add_coach_assessment` prod build'de `prisma migrate deploy` ile Neon'a uygulanır — deploy loglarında doğrulanmalı.

---

## 11. Sıradaki

- **Custom domain** opsiyonel — Cloudflare/Namecheap ~$10/yıl
- **R2 object storage** — orijinal dosyaların saklanması (Cloudflare R2 free tier 10GB)
- **Sentry** — error monitoring (free tier)
- **Yiyecek veritabanı** — prod'da FoodItem tablosu boş, seed veya toplu import gerekli (manuel arama için)
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
