# MetaCoach — Backlog

Öncelikli olmayan, ileride ele alınacak fikirler. (Aktif durum HANDOFF.md'de.)

## Marka & mesaj
- **Motto (global/İngilizce):** Ana aday **"Measure. Learn. Adapt."** (TR: "Ölç. Öğren. Uyarla.").
  Alternatifler: "Coaching that learns you.", "Your data, your coach.", "Know your body by the numbers."
  Nereye: giriş ekranı (logo altı), dashboard karşılama, boş-durum ekranları. Öncelik: düşük.
- Öne çıkan söz (uygulama içi): *"Tahmin etme, ölç — vücudun zaten cevabı biliyor; veri sadece onu duyulur kılıyor."*

## Zengin sağlık widget'ları (Health Auto Export tarzı) — ⭐ backlog
Referans: HAE "Healthy Widgets" ekranı ("All your Metrics · Over 90 data types").
- Metrik başına **renkli, grafikli kart**: Step Count (mor), Heart Rate (kırmızı), Active Energy (turuncu), Cycling (yeşil)…
- Her kartta: başlık + bugünkü/son değer + son ~2 haftalık mini grafik (bar/çizgi).
- Kullanıcı **kart ekle/çıkar/sırala** (mevcut dashboard grid'i genişletilebilir).
- Kaynak: Apple Health ingest zaten aktif kalori/adım getiriyor; ek metrikler (kalp hızı, dinlenme HR, VO2max, uyku, mesafe, kat sayısı…) HAE payload'ında mevcut — adaptörde `METRIC_ALIASES` genişletilip DB'ye taşınır, sonra widget'lara bağlanır.
- İş kalemleri: (a) ek metrikleri sakla (yeni tablo ya da DailyLog genişletme), (b) metrik-kartı bileşeni + renk sistemi, (c) dashboard'a metrik-kartı ekleme akışı.

## Koç modülü — sonraki iterasyonlar
- Koçun danışan panosunu **özelleştirmesi** (widget seç/sırala, danışana özel).
- **Program şablonları** (koç bir haftalık programı şablon olarak kaydedip tekrar kullansın).
- Program **düzenleme** (mevcut koç programını yeniden aç/güncelle; şu an her gönderim yeni program).
- **E-posta ile davet** (şu an paylaşılabilir link; SMTP/e-posta servisi gerekir).
- Koç için **bildirim** (danışan seansı tamamladı/atladı, mesaj geldi).
- Çoklu koç / diyetisyen + antrenör ayrımı (rol/uzmanlık bazlı izinler).

## Aktivite / wearable
- HAE **Antrenmanlar** için ikinci otomasyon rehberi (workout detayının düzenli akması).
- Tam `export.xml` (zip) **geçmiş dolgusu** (büyük dosya — streaming parse ya da istemci ön-agregasyon).
- Apple Health dışı kaynaklar (Garmin/Google Fit) — agregatör (Terra/Vital) opsiyonu.

## Genel
- Beslenme: prod `FoodItem` tablosu boş — besin veritabanı seed/import.
- KVKK/GDPR: veri dışa aktarım/silme akışları (şu an placeholder).
- i18n: İngilizce dil desteği (global kullanıcılar).
