# MetaCoach — Go-Live Runbook (Faz 4)

Bu doküman POC'yi yönetilen servislerde (managed) yayına almak için adımları içerir.
Kilitli karar: **Vercel + Fly.io/Railway + Neon/Supabase (Postgres) + Upstash + Cloudflare R2**.

> Özet: Kod tarafında go-live için gereken her şey hazır (standalone build, Dockerfile,
> `/api/health`, CI). Kalan işler **sır (secret) girmeyi** ve **Postgres'e geçişi** gerektirir.

---

## 1. Deploy seçenekleri

### Seçenek A — Vercel (en hızlı)
- `output: "standalone"` Vercel için zararsız; Vercel kendi runtime'ını kullanır.
- Repo'yu içe aktar → Environment Variables gir (aşağıdaki §3) → Deploy.
- Postgres: Neon/Supabase bağlantı dizesini `DATABASE_URL`'e koy.
- Not: Web Push ve Prisma Vercel'de sorunsuz çalışır. Uzun süren AI parse için Edge değil Node runtime kullan (varsayılan).

### Seçenek B — Fly.io / Railway (container)
- Repo kökünde `Dockerfile` hazır (multi-stage, standalone, non-root, HEALTHCHECK).
- Fly.io:
  ```bash
  fly launch --no-deploy          # fly.toml üretir, internal_port=3000
  fly secrets set DATABASE_URL=... AUTH_SECRET=... ...   # §3
  fly deploy
  ```
- Railway: "Deploy from Repo" → Dockerfile otomatik algılanır → Variables gir → Deploy.
- Sağlık kontrolü yolu: `/api/health` (200 = DB up, 503 = DB down).

---

## 2. SQLite → Postgres geçişi

POC SQLite kullanır. Şema Postgres-uyumlu tasarlandı (enum yerine `String`, JSON string,
`Float`) — bu yüzden geçiş **tek satırlık datasource değişimi**dir.

1. `prisma/schema.prisma` içinde datasource'u değiştir:
   ```prisma
   datasource db {
     provider = "postgresql"   // was: "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. `DATABASE_URL`'i Postgres bağlantı dizesine ayarla (Neon/Supabase):
   ```
   postgresql://user:pass@host:5432/metacoach?schema=public&sslmode=require
   ```
3. İlk migration'ı üret ve uygula:
   ```bash
   npx prisma migrate dev --name init      # yerelde migration dosyası üretir
   npm run db:deploy                        # prod: prisma migrate deploy
   ```
4. (Opsiyonel) Demo veriyi yükle: `npm run db:seed`.

> Migration dosyaları `prisma/migrations/` altında versiyonlanır; prod'da `migrate deploy` çalıştırılır.
> Container deploy'da bu adımı release komutuna koy (Fly.io `release_command`, Railway deploy hook).

---

## 3. Ortam değişkenleri (prod)

| Değişken | Zorunlu | Not |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres bağlantı dizesi |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 33` |
| `AUTH_TRUST_HOST` | ✅ | `"true"` |
| `APP_BASE_URL` | ✅ | Örn. `https://metacoach.app` |
| `PARSE_PROVIDER` | ✅ | `"mock"` veya `"claude"` |
| `ANTHROPIC_API_KEY` | claude ise | Claude Vision parse için |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | push için | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | push için | ↑ aynı komut |
| `VAPID_SUBJECT` | push için | `mailto:...` |
| `TDEE_WINDOW_DAYS` | — | Varsayılan `21` |
| `APP_VERSION` | — | `/api/health` içinde raporlanır (örn. git sha) |

Prod-only (tasarım kararı, sonraya):
`UPSTASH_REDIS_REST_*`, `R2_*` (object storage), `TERRA_*` (wearable).

---

## 4. CI/CD

`.github/workflows/ci.yml` her push (master) ve PR'da çalışır:
- `npm ci` → `prisma generate` → `tsc --noEmit` → `npm run build`.
- DB'ye bağlanmaz (placeholder env). Build başarısızsa merge engellenir.

Deploy'u CI'ye bağlamak istersen (opsiyonel): Vercel/Railway'in GitHub entegrasyonu
otomatik deploy yapar; Fly.io için `flyctl deploy` adımını `FLY_API_TOKEN` secret'i ile ekle.

---

## 5. Yayın sonrası kontrol listesi

- [ ] `GET /api/health` → `{"status":"ok","db":"up"}`
- [ ] `/login` → demo/gerçek hesapla giriş → dashboard
- [ ] PWA yüklenebilir (manifest + SW), Ayarlar'dan push izni → test bildirimi
- [ ] `PARSE_PROVIDER=claude` ise: bir lab PDF yükle → parse → onay akışı
- [ ] Mi Scale paneli (gerçek cihaz Web Bluetooth destekli tarayıcıda)

---

## 6. Henüz kapsam dışı (kullanıcı katılımı gerekir)

- **KVKK/GDPR:** aydınlatma metni, VERBİS, denetim logu, rıza sürümleme, veri dışa aktarım/silme.
- **Monitoring:** Sentry/log drain (DSN girince aktifleştirilebilir).
- **Object storage:** yüklenen dosyaları R2/S3'e taşı (şu an yerel/DB referansı).
- **OAuth + e-posta doğrulama + şifre sıfırlama.**
- **Pentest** ve yük testi.
