# MetaCoach — Oturum Devir Dokümanı (Handoff)

> Bu dosyayı yeni sohbete yapıştır ya da "MetaCoach HANDOFF.md'yi oku ve kaldığımız yerden devam et" de.
> **Backlog:** öncelikli olmayan fikirler `BACKLOG.md`'de (zengin sağlık widget'ları, motto, koç şablonları vb.).
> **Koç program builder** artık takvim/hafta görünümü (gün-şeridi + seçili gün editörü).
> Tarih: 2026-08-29 · Durum: **Faz 0–4B tamamlandı, master'da (PR #1–#26 merge), CI yeşil, CANLI.** Neon (Frankfurt) + Vercel (Hobby). Son sprint: koç modülü, Mi Scale 2 BLE, dashboard gerçek kalori, antrenman dedup, zamana göre selamlama, antrenman senkron teşhisi, koç-bilinçli antrenman, Resend ile koç e-postası, **günlük bildirim cron'u (toggle-farkında)**. Domain altyapısı (`metacoachhealth.com`) devam ediyor.
> ⚠️ **HAE 2. otomasyon (Workouts) kuruldu** — antrenman senkronu aktif.

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
    coach/preview/            # Koç Önizleme sandbox (planla + danışan görünümünü canlı gör, kaydetmez)
    api/
      auth/[...nextauth]/     # NextAuth handlers
      register/               # kayıt
      ingest/ ingest/confirm/ # parse + onaylı kaydet
      mi-scale/reading/       # tartı ölçümü → kompozisyon
      biometric/[id]/         # DELETE ölçüm silme (kullanıcı sahiplik kontrolü)
      ingest/health/manual/   # manuel JSON yükleme (oturum korumalı, token gerektirmez)
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
      cron/coach-reminder/    # haftalık koç hatırlatma (Vercel Cron, CRON_SECRET)
      cron/daily-reminders/   # günlük push bildirim (tartılma/öğün — toggle-farkında)
  components/
    app-shell.tsx             # sidebar + topbar + tema + çıkış + kullanıcı
    theme-provider.tsx        # system/light/dark, .dark class, no-flash
    dashboard/dashboard-grid.tsx  # dnd-kit sürükle-sırala + widget aç/kapat + kalıcılık
    dashboard/widgets.tsx     # tüm widget render'ları
    charts.tsx                # Recharts: WeightEnergyChart, TdeeHistoryChart, Ring, Sparkline
    mi-scale-panel.tsx        # Web Bluetooth (notification tabanlı GATT) + simülatör
    biometric-history.tsx     # ölçüm geçmişi listesi + silme (çift tıkla onay)
    coach-access-card.tsx     # Ayarlar'daki koç erişimi kartı (önizleme linki dahil)
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
    email.ts                  # Resend e-posta istemcisi (koç hatırlatma vb.)
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
prisma/schema.prisma          # User, LabResult, LabBiomarker, Biometric, Meal, DailyLog(+basalKcal),
                              # FileAsset, DeviceConnection, Consent, FoodItem,
                              # MetabolismEstimate, DashboardLayout, Settings, PushSubscription,
                              # Exercise, WorkoutProgram, WorkoutSession(+source), WorkoutSet,
                              # CoachAssessment, HealthIngestToken, HealthIngestLog; User(+activityAuto)
prisma/migrations/20260826160000_add_dailylog_basal/    # DailyLog.basalKcal
prisma/migrations/20260828180000_add_health_ingest_log/ # HealthIngestLog (senkron teşhisi)
prisma/migrations/0_init/     # Postgres init migration (14 tablo)
prisma/migrations/20260825110158_add_workout_module/   # antrenman tabloları
prisma/migrations/20260825120000_add_coach_assessment/ # CoachAssessment tablosu
prisma/migrations/20260825130000_add_health_ingest/    # HealthIngestToken + activityAuto + WorkoutSession.source
prisma/seed.ts                # Emre + 28 gün geçmiş + lab + öğünler + Mi Scale ölçümleri (+bcrypt şifre)
scripts/set-db-provider.mjs   # DATABASE_URL'den provider otomatik ayar
.github/workflows/ci.yml      # typecheck + lint + build + Postgres migrate smoke
sentry.*.config.ts            # server/edge/client Sentry (DSN yoksa inert)
instrumentation.ts            # Next.js instrumentation hook
vercel.json                   # build: db:provider + migrate deploy + next build; region fra1; crons: coach-reminder (Pzt 06:00 UTC)
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
- **Koç akışı v2 — davet linki + haftalık program** ✅ (2026-08-26, branch'te): Kullanıcı geri bildirimiyle akış sadeleştirildi. ① **Davet linki:** danışan Ayarlar→Koç erişimi'nde önce modülleri seçer, sonra tek link üretir (`CoachInvite.permissions` + migration); koç linke (`/coach/accept/[code]`) tıklayıp giriş yapınca **otomatik bağlanır** (seçili izinlerle) — kod yazma/ayar dolaşma yok. ② **Koç landing:** role=coach → `/` `/coach`'a yönlenir. ③ **Haftalık program builder:** `/coach/[clientId]`'de gün/hareket/set/tekrar seçilir (`coach-program-builder.tsx`, EXERCISE_LIBRARY), `/api/coach/program` her gün için `WorkoutSession(source="coach")`+WorkoutSet oluşturur, kalori `estimateSessionKcal` (MET) ile otomatik. Tek aktif koç WorkoutProgram (öncekini pasifler). ④ **Danışan:** program mevcut `/workout` ekranına düşer; **"Seansı tamamla"** (onay) + **"Bugün olmadı"** (skip) — mevcut session PATCH endpoint'i kullanılır (tamamlanınca MET kalori hesaplar). Koç programında "Yenile" gizli (üzerine yazmayı önler). Onaylanan seans "Son antrenmanlar"+"bu hafta N seans"+koç görünümüne düşer; **DailyLog.activeKcal'e EKLENMEZ** (Apple Health ile çift sayım yok). Kararlar: davet linki, MET motoru, aktif-kaloriye-ekleme-yok.
- **Sprint 2 — Koç/PT rolü (hafif MVP v1)** ✅ (2026-08-26, master'da PR #9-11): Çok-kullanıcılı koç-danışan. `User.role` (user|coach); `CoachInvite` (danışan başına davet kodu), `CoachLink` (koç↔danışan + `permissions` JSON modül izinleri + status), `TrainingPlan` (tek aktif plan), `CoachComment` (koç↔danışan thread) + migration. **Akış:** danışan Ayarlar→"Koç erişimi"nden davet kodu üretir + modül izinlerini aç/kapatır (`/api/coach/invite`, `/api/coach/permissions`); koç `/coach/join`'de kodu girip bağlanır → rolü coach olur (`/api/coach/join`); `/coach` danışan listesi, `/coach/[clientId]` izinli modül özetleri (getDashboardData reuse) + plan editörü + yorum; danışan `/plan`'da planı görür + yorum yazar. `/api/coach/plan` (tek aktif plan, öncekini arşivler), `/api/coach/comment` (authorRole role'den). Nav rol-farkında (`layout.tsx` DB'den role çeker → AppShell): koç "Koçluk", danışan "Planım". `lib/coach.ts` erişim/izin yardımcıları (COACH_MODULES: activity/workout/nutrition/biometrics/metabolism/assessment). Yetki: her koç erişimi aktif CoachLink+izin ile doğrulanır; `/coach/[id]` erişim yoksa notFound. **Demo:** `coach@metacoach.app` / `metacoach123` (Koç Deniz) → Emre'ye bağlı, örnek plan+yorum, izinler açık. **Not:** davet kodu tek koç içindir; e-posta davet/onay akışı yok (kod out-of-band paylaşılır).
- **Aktivite görünürlüğü** ✅ (2026-08-26, master'da PR #8): Apple Health verisi artık görünür — ① Dashboard **"Aktivite" widget'ı** (bugün/7g aktif kalori + adım, aktif-kalori sparkline, son antrenman, bağlı rozeti); ② Antrenman sayfasında **"Son antrenmanlar"** listesi (tamamlanan seanslar, Apple Health'ten gelenler "Apple Health" rozetli); ③ Dashboard adaptif öneride **kalibrasyon notu** (`aktivite: <activityBase> · Apple Health`). `dashboard-data.ts` `activity` + `recentWorkouts` döndürüyor. Önceden veri yazılıyor ama hiçbir ekranda gösterilmiyordu.
- **Ön-lansman Sprint 1 (UX cilası)** ✅ (2026-08-26, master'da PR #7): ① **Menü sadeleştirildi** — birincil (Dashboard/Beslenme/Antrenman/Biyometri) + "Hesap" grubu (Metabolizma/Yükle/Ön Değerlendirme/Profil/Ayarlar) `app-shell.tsx`. ② **Dashboard yerleşimi** — widget span'leri 1/2/4'e normalize edildi (3 kaldırıldı, grafik tam genişlik), kartlara `h-full` (satır yükseklikleri eşit) → boşluk/hizalama düzeldi. ③ **Gün bazlı kalori** — Dashboard'a `weeklyBalance` widget'ı (alınan bar vs TDEE çizgisi, `CalorieBalanceChart`); Beslenme sayfasına **son 14 günün gün-gün geçmişi** (açılır kart, günlük toplam + öğünler). Karar: kullanıcı testi öncesi Sprint 1 = madde 1-2-3; **Sprint 2 = koç/PT rolü** (hafif MVP: koç girişi + plan/yorum + modül izinleri) — henüz başlanmadı.
- **Wearable aktivite otomasyonu** ✅ (2026-08-26, PR #4/#5/#6 master'da, **prod'da uçtan uca doğrulandı**: Health Auto Export → webhook `ok:true`, activityBase kalibre oldu; adaptör gerçek HAE şemasına göre düzeltildi — kJ→kcal, saniye→dk, TR workout tipleri): Manuel antrenman girişi TDEE'yi beslemiyordu (yüksek efor/sıfır fayda) → çözüm: aktiviteyi otomatik akıt. **Karar:** Apple Health tek toplama merkezi (Watch + Technogym oraya senkron), oradan push webhook. **Mimari:** `HealthIngestToken` (kullanıcı başına gizli token) → `POST /api/ingest/health` (Bearer token, session'sız, `PUBLIC_PREFIXES`'te) → `lib/health-import.ts` adaptörü (Health Auto Export JSON + generic/Kısayol biçimi, biçim-toleranslı) → `DailyLog.activeKcal/steps` upsert + `WorkoutSession(source="imported", completed)`; o güne planlı seans varsa onu oto-tamamlar (elle set işaretleme biter). `lib/activity-calibration.ts` son 28 günün aktif kalori/adımından `activityBase`'i otomatik türetir (`User.activityAuto` ile override edilebilir); **yakılan kalori TDEE'ye/hedefe EKLENMEZ** (çift sayma yok). Ayarlar'da "Apple Health & Aktivite" kartı: webhook URL + token + kurulum adımları + yenile. Adaptör fixture testi geçti (HAE + generic). **Not:** Apple tam export'u (`dışa aktarılan.xml`) 671 MB — webhook'a uygun değil; sadece nadir/yerel geçmiş dolgusu (henüz yok). Kullanıcının iOS tarafını (Health Auto Export app veya Kısayol) kurması gerekiyor; gerçek payload ile alan eşlemesi son kez teyit edilecek. `source` alanı `WorkoutSession`'a eklendi.
- **Ön Değerlendirme modülü** ✅ (2026-08-25, PR #2 master'a merge — build/lint/typecheck temiz; **prod doğrulaması kullanıcıda**): Antrenör/diyetisyen görüşmesi öncesi 3-bölümlük intake — ① son 2-3 günlük yemek alışkanlıkları (serbest metin), ② kişisel rutin (uyanış/uyku saati + hareket seviyesi), ③ son kan tahlilleri varsa (B12, D vit, açlık insülini, HOMA-IR, TSH → referans aralığına göre düşük/normal/yüksek rozet). `/assessment` sayfası + hazırlık göstergeli form (taslak kaydet / görüşmeye gönder), `CoachAssessment` modeli (kullanıcı başına tek kayıt, upsert), `POST /api/assessment`, nav girişi, demo seed. **Not:** kendini-değerlendirme aracı; referans aralıkları bilgi amaçlı, tanı değil.
- **Fix: öğün fotoğrafı galeriden yükleme** ✅ (2026-08-25, PR #2): `nutrition-client.tsx` tek `<input capture="environment">` kullanıyordu → mobil tarayıcıyı kameraya zorlayıp galeriyi engelliyordu. Kamera (capture'lı) + galeri (capture'sız) için ayrı input ve "Fotoğraf çek" / "Galeriden yükle" iki buton. (Masaüstünde zaten seçici açılıyordu; asıl etki mobilde.)
- **Fix: antrenman eşleştirmede dayType kontrolü + dedup güçlendirme** ✅ (2026-08-28, PR #23-#24): ① Planlı seansla otomatik eşleştirme artık `dayType` (strength/cardio/functional) kontrolü yapıyor. ② **Dedup bugı düzeltildi:** tekilleştirme yalnızca `source:"imported"` seansları kontrol ediyordu — planlı seansı tamamlayıp sonra aynı antrenmanı "imported" olarak tekrar oluşturuyordu. Artık **tüm kaynaklar** (planlı/koç/imported) ±5dk penceresi + aynı label ile kontrol ediliyor. `health-import.ts`.
- **Antrenman senkron teşhisi + HAE 2-otomasyon düzeltmesi** ✅ (2026-08-28, PR #25): **Kök neden bulundu** — antrenmanlar 27 Ağu'da donmuştu çünkü HAE'de **Workouts ayrı bir export türüdür**, metrik listesinde seçilen bir öğe değil. Kurulum talimatı `Workouts`'u metrik gibi sayıyordu → kullanıcının otomasyonu yalnızca "Sağlık Metriği" gönderiyordu, antrenman hiç gelmiyordu. Ingest hattının kendisi sağlam (fixture doğrulaması: HAE workouts payload'ı → 22 dk / 194 kcal, ekrandaki değerle birebir). ① **`HealthIngestLog` modeli + migration** — her içe aktarma kaydediliyor (via, source, alınan/yazılan gün + antrenman sayısı). Önceden yalnızca `lastSyncAt` vardı; metrik-only senkron başarılı senkronla aynı görünüyordu. ② Ayarlar'da **"Son senkronlar"** paneli (`SyncDiagnostics`): her satırda gün/antrenman sayısı; son senkronların hepsinde antrenman 0 ise **uyarı** çıkıyor ve eksik otomasyonu tarif ediyor. ③ Kurulum talimatı **2 otomasyon** olarak düzeltildi (Health Metrics + Workouts). ④ Payload toleransı: `data` sarmalayıcısı olmadan gelen `workouts`/`metrics` de tanınıyor (`days` varsa generic'e düşer — regresyon testli), workout tipi `name`/`type`/`workoutActivityType` üçünden de okunuyor.
- **Koç-bilinçli antrenman + admin debug** ✅ (2026-08-28, PR #26 → sonra refactor): ① **Antrenman sayfası**: program yoksa ve koça bağlıysa "AI ile oluştur" yerine "Koçun programını bekliyor" mesajı. **Koçlu kullanıcıda yalnızca `source="coach"` program/seanslar gösteriliyor** — şablon/AI/imported veriler gizleniyor (yaklaşan seanslar + "Son antrenmanlar" dahil). ② Program başlığında `source="coach"` → "Koç" rozeti (yeşil). ③ **Admin debug endpoint** (`GET /api/admin/debug`): koç bağlantısı, senkron geçmişi, son antrenmanlar, aktif program. ④ **coachPlan widget'ı kaldırıldı** — `TrainingPlan` (serbest metin not) ile `WorkoutProgram` (yapılandırılmış program) karışıklığı yarattığı için. ⑤ **Menüden "/plan" (Planım) linki kaldırıldı** — antrenman takibi `/workout` altında yapılır. ⑥ `nextWorkout` widget: `/plan`'a yönlendirme kaldırıldı. ⑦ `dashboard-data.ts`'den koç plan/yorum veri çekimi kaldırıldı (gereksiz DB sorgusu).
- **Resend ile koç haftalık hatırlatma e-postası** ✅ (2026-08-28, PR #27): Koçlara her Pazartesi sabahı (09:00 İstanbul / 06:00 UTC) haftalık danışan özet e-postası gönderilir. ① **`src/lib/email.ts`** — Resend client wrapper (FROM adresi `EMAIL_FROM` env ile değiştirilebilir, varsayılan Resend sandbox). ② **`src/app/api/cron/coach-reminder/route.ts`** — Vercel Cron endpoint: tüm koçları bulur, her birinin aktif danışanlarını toplar; danışan başına: haftalık tamamlanan antrenman, son senkron, aktif program var mı, aktif plan başlığı, son ağırlık. HTML e-posta: danışan tablosu + "Program yok" uyarı kutusu (CTA) + "Paneli Aç" butonu. `CRON_SECRET` Bearer token ile korunur. ③ **`vercel.json`** — `crons` array eklendi (`0 6 * * 1`). ④ **`.env.example`** — `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` eklendi. **Resend free tier:** 100 e-posta/gün, 3000/ay — mevcut ölçekte fazlasıyla yeterli. **Kurulum:** Vercel dashboard'da `RESEND_API_KEY` ve `CRON_SECRET` env var'ları eklenmeli.
- **Fix: zamana göre selamlama** ✅ (2026-08-28, PR #24): Dashboard'da sabit "Günaydın" yerine saate göre: 05-12 → "Günaydın", 12-18 → "İyi günler", 18-05 → "İyi akşamlar". `dashboard-grid.tsx`.
- **Mi Scale 2 BLE iyileştirmeleri** ✅ (2026-08-28, PR #20–#22): ① `readValue()` → `startNotifications()` (Mi Scale 2 body composition'ı notification olarak gönderiyor, doğrudan read desteklemiyor — "GATT operation not permitted" düzeldi). ② Birim algılama: catty/jin yanlışlıkla lbs olarak okunuyordu (97.5 kg → 88.5 kg hatası düzeldi). BLE frame'inden ölçüm zamanı çıkarılıyor. ③ Biyometri sayfasına ölçüm silme (çift tıkla onay, `DELETE /api/biometric/[id]`). ④ Ayarlar → Apple Health kartına **manuel JSON yükleme** (sürükle-bırak, `POST /api/ingest/health/manual` — oturum korumalı, token gerektirmez). ⑤ GATT hatası Türkçe kullanıcı dostu mesajla açıklanıyor; iptal sessiz. ⑥ "Yakılan" → "Toplam harcama" (bazal+aktif toplam). 60 sn BLE timeout, bekleme UI, temiz bağlantı kapatma.
- **Dashboard gerçek yakılan kalori** ✅ (2026-08-28, PR #19): "Yakılan kalori" sabit TDEE (~2850) gösteriyordu → artık **günlük bazal+aktif** gerçek değer. ① `DailyLog.basalKcal` alanı + migration. ② `health-import.ts` basal_energy_burned / resting_energy ingest (kJ→kcal). ③ `dashboard-data.ts` burned = basalKcal + activeKcal (Apple bazal yoksa Katch-McArdle BMR fallback; veri yoksa null — çizgi kırılır). ④ `CalorieBalanceChart` günlük alınan (bar) vs harcanan (çizgi), tooltip'te günlük denge.
- **Koç Önizleme sandbox** ✅ (2026-08-27, PR #18): Tek ekranda koç programı planla + danışan görünümünü canlı gör. Solda takvim builder, sağda danışanın göreceği hareketler/set/tekrar/MET kalori anında güncellenir. **Hiçbir şey kaydedilmez** — gerçek veriyi etkilemez. `CoachProgramBuilder`'a `onPreview` callback; `/coach/preview` sayfası; Ayarlar→Koç erişimi kartına link.
- **Fix: dashboard hard-coded isim + davet kodu** ✅ (2026-08-27, PR #17): ① Dashboard selamlaması "Günaydın, Emre" olarak sabitti → giriş yapan kullanıcının adı gösteriliyor. ② Davet kodları base64url (karışık harf) üretiliyordu ama join `toUpperCase()` yapıyordu → "Kod bulunamadı". Kodlar artık büyük harf hex; join birebir eşleşme.
- **Koç takvim program görünümü** ✅ (2026-08-27, PR #16): `coach-program-builder.tsx` gün-blokları yerine **haftalık takvim** (hafta gezgini + Pzt-Paz gün şeridi + seçili gün editörü). Boş günler dinlenme; API aynı.
- **Koç menü sadeleştirme** ✅ (2026-08-27, PR #14): Koç menüsü yalnızca "Danışanlar" + "Ayarlar"a indirildi (kullanıcı ekranları koça gösterilmiyordu — kalabalık/karışıklık). Tek danışanı olan koç `/coach`'a girince doğrudan o danışanın paneline yönlenir.
- **Demo seed güncelleme** ✅ (2026-08-27, PR #15): TrainingPlan gerçek 24.08 ders değerlendirmesiyle güncellendi (üst/alt ekstremite, kalça fleksörleri, core).
- **Fix: callbackUrl koç davet linki** ✅ (2026-08-26, PR #13): Middleware redirect'i callbackUrl'i mutlak URL olarak veriyordu; `safeCallback` yalnızca `"/"`ile başlayanı kabul edip tam URL'i `"/"`'a düşürüyordu → koç giriş sonrası `/coach/accept`'e gitmiyordu. Aynı-origin mutlak URL artık path+search olarak kabul ediliyor.
- **Antrenman modülü** ✅ (2026-08-25, tarayıcıda doğrulandı): 4 fazlı periyodizasyon (hazırlık→ana yüklenme→kardiyo→soğuma), 3 gün A/B split (A=kuvvet, B=fonksiyonel). Claude ile kişiye özel program üretimi (strict tool call) + deterministik şablon fallback. 34 egzersizlik salon kütüphanesi. `/workout` sayfası (4 faz akordeonu, set işaretle/ağırlık logla, seansı tamamla), dashboard `nextWorkout` widget'ı, "Antrenman" nav. Adaptif antrenman-günü protein artışı. **Kritik karar:** tahmini yakılan kalori sadece gösterim — Dynamic TDEE'ye BESLENMEZ (çift sayım önlenir; TDEE zaten toplam harcamayı kilo/alım'dan öğreniyor). estKcal doğrulandı (519 kcal / 59 dk).

**Build:** 30+ route + middleware (workout + assessment + coach preview + biometric delete + manual ingest dahil), tip hatası yok, `npm run build` temiz. **Prod:** `metacoach-three.vercel.app`

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
- `RESEND_API_KEY` — Resend e-posta servisi (koç hatırlatma, free tier 100/gün)
- `EMAIL_FROM` — gönderici adresi (varsayılan: `MetaCoach <onboarding@resend.dev>`, custom domain ile değiştirilebilir)
- `CRON_SECRET` — Vercel Cron endpoint güvenliği (`openssl rand -base64 33`)
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

### ⏳ Domain & e-posta altyapısı (2026-08-29, devam ediyor)
- **Domain:** `metacoachhealth.com` Cloudflare Registrar'dan satın alındı (Active)
- **Sorun:** Resend sandbox (`onboarding@resend.dev`) yalnızca hesap sahibi (emrecakmak@me.com) adresine gönderebiliyor → koç e-postası (zehraogul95@gmail.com) 403 alıyor. Vercel'de SMTP (port 587/465) engellendiği için Nodemailer çalışmıyor — **SMTP kodu kaldırıldı**.
- **Çözüm:** Cloudflare'da domain → Resend'e ekle → DNS (SPF/DKIM/DMARC) doğrula → `noreply@metacoachhealth.com` olarak herhangi bir adrese e-posta gönder
- **Kalan adımlar:**
  1. Resend → Domains → `metacoachhealth.com` ekle → DNS kayıtlarını al
  2. Cloudflare DNS'e SPF, DKIM (3 kayıt), DMARC ekle
  3. Vercel'e custom domain ekle → Cloudflare'da CNAME yapılandır
  4. Vercel env: `EMAIL_FROM=MetaCoach <noreply@metacoachhealth.com>`, `APP_BASE_URL=https://metacoachhealth.com`
  5. Vercel'den SMTP_* env var'larını sil (artık gereksiz)
  6. Coach-reminder cron'u tetikle → koça düzeltilmiş e-posta gönder
- **Kod hazır:** `email.ts` Resend-only (nodemailer/SMTP kaldırıldı), `.env.example` SMTP satırları kaldırıldı

### ⏳ Prod doğrulaması bekleyen (2026-08-28)
- **Mi Scale 2 BLE (notification tabanlı okuma + kilo doğruluğu)** — PR #21-#22, canlıda gerçek tartı ile test bekleniyor.
- **Dashboard gerçek yakılan kalori** — PR #19, `DailyLog.basalKcal` migration'ı prod'a uygulanmış olmalı; canlıda grafik kontrolü bekleniyor.
- **Manuel sağlık verisi yükleme** — PR #22, Ayarlar'dan JSON sürükle-bırak ile ingest; prod testi bekleniyor.
- **Antrenman geçmişi takvim şeridi** — gün bazlı gruplama, kaynak rozeti, 10+ sayfalama.
- **Koç e-postasında program kontrolü** — `source:"coach"` filtresi, template/AI programlar yanlış "program var" göstermez.
- **Dashboard dün desteği** — gece yarısından sonra bugün verisi yoksa dünün beslenme/aktivitesini "Dün" etiketiyle gösterir.
- **Günlük bildirim cron'u** — `notifyWeighIn`/`notifyMeals` toggle'ları artık çalışıyor. `/api/cron/daily-reminders` sabah 06:00 UTC (tartılma) ve 17:00 UTC (öğün) push bildirimi gönderiyor, toggle kapalıysa göndermiyor. `vercel.json` crons güncellenmiş.

---

## 11. Sıradaki

- **Neon MCP Server entegrasyonu** — `.claude/settings.json`'a `https://mcp.neon.tech/mcp?category=querying&category=schema&readonly=true` ekle → Claude Code oturumları DB'yi doğrudan sorgulayabilir (koç giriş yapmış mı, antrenman senkron durumu vb.). OAuth ile auth, API key gerektirmez. CCR ortamında ağ politikası `neon.tech` erişimine izin vermeli. Geçici çözüm: `GET /api/admin/debug` endpoint'i (oturum korumalı).
- **Custom domain** `metacoachhealth.com` (Cloudflare, Active) — Resend doğrulama + Vercel CNAME
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
