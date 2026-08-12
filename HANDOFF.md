# MetaCoach — Oturum Devir Dokümanı (Handoff)

> Bu dosyayı yeni sohbete yapıştır ya da "MetaCoach HANDOFF.md'yi oku ve kaldığımız yerden devam et" de.
> Tarih: 2026-08-12 · Durum: **Faz 0–3 tamamlandı ve doğrulandı**, çalışır durumda.

---

## 1. Proje nedir

**MetaCoach** — web tabanlı, mobil uyumlu (PWA) "Next-Gen Adaptive Health & Nutrition" platformu.
Kan tahlili PDF'i ve InBody/akıllı tartı görsellerini **AI ile okur**, giyilebilir veriyi birleştirir,
kilo/yağ değişiminden **gerçek metabolizma hızını (Dynamic TDEE) öğrenir**. Apple-kalitesinde,
kart tabanlı, dark/light, **kullanıcının özelleştirebildiği** dashboard.

**Konum:** `/Users/emrecakmak/Projects/MetaCoach` (git repo değil — istenirse `git init`).
**Görsel tasarım dokümanı (artifact):** https://claude.ai/code/artifact/0ea09d80-710a-4d0d-94f1-f81156dc8f4d

---

## 2. Kullanıcı (Emre) ve çalışma tarzı

- **Türkçe** yazışır ve Türkçe yanıt bekler. Teknik (architect seviyesi promptlar yazıyor).
- **Fazlı, onay kapılı** akış ister: analiz → eksik tamamlama → plan → POC → *onay* → geliştirme.
  Açık kararları uzmanlığa bırakır ("gerisini sana bırakıyorum") ama tasarım ve POC'de açık onay kapıları ister.
- Görsel/yapılandırılmış teslimatları sever (tasarım-doküman artifact'ını beğendi).

---

## 3. Kilitli kararlar (kullanıcıdan)

- **Dağıtım:** managed servisler (Vercel + Fly.io/Railway + Neon/Supabase + Upstash + Cloudflare R2).
- **POC parse:** mock ile başla; gerçek Claude Vision opsiyonel (kod hazır, anahtar gerektirir).
- **Sadece bireysel** (koç/multi-tenant yok).
- Zorunlu özellikler: **Mi Body Composition Scale 2** entegrasyonu, **kişiselleştirilebilir dashboard**
  (sürükle-sırala + widget aç/kapat), **profil** (bilgiler saklanır) + **ayarlar**.
- **Faz 3 öncelikleri (seçilen):** ① Gerçek AI parse (Claude), ② Kimlik doğrulama (Auth.js), ③ PWA + bildirim.
  **Wearable senkron (Terra/Vital) sonraya bırakıldı.**

---

## 4. Mimari & teknoloji

**POC = tek runtime** (hızlı çalışsın diye): Next.js 15 (App Router) + TypeScript + Tailwind v3 +
Recharts + **Prisma/SQLite**. Üretimde Python/FastAPI mikroservisleri (OCR/AI, metabolizma), Redis/Celery,
Postgres, object storage — tasarım dokümanında belgeli. **Prod'a geçiş: `schema.prisma`'da datasource'u
`sqlite`→`postgresql` yap + `DATABASE_URL`'i değiştir (tek satır).**

Ana bağımlılıklar: next 15.1.6, react 18.3.1, prisma 6.2.1, recharts 2.15, @dnd-kit, lucide-react,
next-auth ^5.0.0-beta.25, bcryptjs, web-push, @anthropic-ai/sdk ^0.116, zod ^3.25.76.

---

## 5. Çalıştırma

```bash
cd /Users/emrecakmak/Projects/MetaCoach
npm install          # gerekirse
npm run setup        # SQLite şema + 28 günlük seed
npm run dev          # http://localhost:3000
```

**Demo giriş:** `emrecakmak@me.com` / `metacoach123`
Diğer komutlar: `npm run build`, `npm run db:seed`, `npm run db:reset`.

**Not:** Dev sunucusu bu oturumda arka planda çalışıyordu; yeni oturumda yeniden başlat.
Auth/middleware değişikliklerinden sonra dev sunucusunu **yeniden başlat** (port 3000'i öldür + `npm run dev`).

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
  components/
    app-shell.tsx             # sidebar + topbar + tema + çıkış + kullanıcı
    theme-provider.tsx        # system/light/dark, .dark class, no-flash
    dashboard/dashboard-grid.tsx  # ⭐ dnd-kit sürükle-sırala + widget aç/kapat + kalıcılık
    dashboard/widgets.tsx     # tüm widget render'ları
    charts.tsx                # Recharts: WeightEnergyChart, TdeeHistoryChart, Ring, Sparkline
    mi-scale-panel.tsx        # Web Bluetooth + simülatör
    nutrition-client.tsx  profile-form.tsx  settings-form.tsx
    push-controls.tsx  pwa-register.tsx  recompute-button.tsx
  lib/
    db.ts                     # Prisma singleton + getCurrentUser (session'dan; auth'u dinamik import)
    tdee.ts                   # ⭐ Dynamic TDEE motoru (EWMA + enerji dengesi + Katch-McArdle)
    mi-scale.ts               # ⭐ BLE çözücü + Xiaomi kompozisyon matematiği (yaklaşım)
    mock-parser.ts            # deterministik mock parse
    claude-parser.ts          # ⭐ gerçek Claude Vision (claude-opus-5, strict tool call)
    parser.ts                 # mock/claude dağıtıcısı (PARSE_PROVIDER)
    push.ts                   # web-push (VAPID) sunucu tarafı
    dashboard-data.ts         # dashboard veri toplayıcı + TDEE hesaplar
    widgets.ts                # widget kaydı & varsayılan yerleşim
    meals.ts  utils.ts
prisma/schema.prisma          # User, LabResult, LabBiomarker, Biometric, Meal, DailyLog,
                              # FileAsset, DeviceConnection, Consent, FoodItem,
                              # MetabolismEstimate, DashboardLayout, Settings, PushSubscription
prisma/seed.ts                # Emre + 28 gün geçmiş + lab + öğünler + Mi Scale ölçümleri (+bcrypt şifre)
public/ manifest.webmanifest sw.js offline.html icons/
README.md                     # kurulum + go-live + KVKK
```

---

## 7. Neler tamam (Faz 0–3) — doğrulama durumu

- **Faz 0 Tasarım** ✅ — sistem mimarisi, ERD, API, Dynamic TDEE, UI (artifact yayında).
- **Faz 1 İskele + yerel ortam** ✅ — monorepo, Prisma/SQLite, seed.
- **Faz 2 POC** ✅ (tarayıcıda doğrulandı): dashboard, Mi Scale simülasyon akışı (ölçüm→kompozisyon→kayıt),
  TDEE motoru (curl: observed 2591 × w0.86 + prior 2740 → 2612), beslenme, metabolizma, profil, ayarlar,
  dark mode (DOM ile teyit). `next build` hatasız.
- **Faz 3** ✅ (built + verified 2026-08-12):
  - **Auth.js** (Credentials+JWT, middleware, login/register, bcrypt): tarayıcıda uçtan uca test —
    `/`→307→`/login`, demo giriş→dashboard (isim+avatar+çıkış).
  - **Gerçek Claude Vision parse**: `PARSE_PROVIDER=claude` + `ANTHROPIC_API_KEY` ile `claude-opus-5`
    strict tool call; yoksa mock'a düşer. Dağıtıcı + mock yolu test edildi (canlı Claude anahtar bekliyor).
  - **PWA + web push**: SW aktif (offline + manifest + installable), VAPID + subscribe/test endpoint'leri,
    Ayarlar'da push kontrolleri. JS ile teyit: swActive:true, manifest/sw/offline=200.
    (Bildirim izni sandbox tarayıcıda `denied` — gerçek Chrome/Edge'de tam çalışır.)

**Build:** 24 route + middleware, tip hatası yok.

---

## 8. Ortam değişkenleri (.env)

`.env` yerelde dolu (dev değerleriyle). Şablon: `.env.example`.
- `DATABASE_URL="file:./dev.db"` (prod: Postgres URL)
- `AUTH_SECRET` (dev değeri var; prod: `openssl rand -base64 33`), `AUTH_TRUST_HOST="true"`
- `PARSE_PROVIDER="mock"` → gerçek için `"claude"` + `ANTHROPIC_API_KEY` ekle
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (dev anahtarları üretildi)
- `TDEE_WINDOW_DAYS="21"`

---

## 9. Önemli kararlar & tuzaklar (gotchas)

- **SQLite kısıtları:** enum yok → `String`; array/JSON yok → JSON string; Decimal yerine `Float`. Prod'da yükseltilebilir.
- **Apple Health web'de cloud API'sı yok** → prod'da Terra/Vital agregatörü (tasarım kararı). POC'de Mi Scale doğrudan.
- **Auth döngüsü:** `db.ts.getCurrentUser` içinde `auth`'u **dinamik import** eder (db↔auth circular'ı kırmak için).
- **Middleware** edge'de çalışır → `auth.config.ts` prisma/bcrypt import ETMEZ; gerçek doğrulama `auth.ts`'te (node).
- **Recharts** ilk mount'ta animasyon yüzünden ekran görüntüsünde boş görünebilir — gerçekte doğru render eder.
- **zodOutputFormat** (Anthropic SDK) Zod v4 bekliyor; biz Zod v3 kullanıyoruz → parse için **strict tool call** yaklaşımı tercih edildi.
- **Tarayıcı paneli** ekran görüntüsü bazen tema değişimini bir kare geç yansıtıyor; DOM computed style kesin kanıt.
- Prisma 6.2 stabil; 7'ye yükseltme uyarısı var, dokunulmadı.

---

## 10. Sıradaki adımlar (kullanıcıya sunulan seçenekler)

Kullanıcı henüz seçmedi — yeni oturumda sor:
- **(a) Wearable senkron** — Terra/Vital ile Apple Health + Garmin (adım/nabız/aktif kalori). (Faz 3'te ertelendi.)
- **(b) Faz 4 go-live hazırlığı** — managed dağıtım + CI/CD (GitHub Actions) + SQLite→Postgres geçişi + Sentry/monitoring.
- **(c) Gerçek Claude parse'ı canlı deneme** — kullanıcının `ANTHROPIC_API_KEY`'i ile `PARSE_PROVIDER=claude`.
- **(d) UI/akış ince ayarı** — dashboard kartları, marka rengi (şu an jade-teal + amber), ek ekranlar.
- **Faz 4 kalanları:** KVKK/GDPR (aydınlatma metni, VERBİS, denetim logu, rıza sürümleme, veri dışa aktarım/silme),
  pentest, gerçek object storage (R2/S3), OAuth/e-posta doğrulama + şifre sıfırlama. Bunlar hukuki/operasyonel,
  kullanıcı katılımı gerekir.

---

## 11. Hafıza (persistent memory)

Şurada tutuluyor: `~/.claude/projects/-Users-emrecakmak-Projects-MetaCoach/memory/`
- `metacoach-project.md` — hedefler, kilitli kararlar, faz durumu (Faz 3 done olarak güncel).
- `emre-workflow.md` — Türkçe, teknik, onay-kapılı çalışma tarzı.
- `MEMORY.md` — index.
