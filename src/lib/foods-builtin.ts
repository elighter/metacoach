// 100+ Türkçe besin — DB boş olsa bile aramada kullanılır.
// Değerler 100 g başınadır (USDA / Türk Gıda Kompozisyon Veritabanı yaklaşımı).

interface BuiltinFood {
  id: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
}

let _id = 0;
function f(
  name: string,
  kcal: number,
  p: number,
  c: number,
  fat: number,
): BuiltinFood {
  return {
    id: `builtin-${++_id}`,
    name,
    kcalPer100g: kcal,
    proteinPer100g: p,
    carbPer100g: c,
    fatPer100g: fat,
  };
}

export const BUILTIN_FOODS: BuiltinFood[] = [
  // ── Protein kaynakları ──
  f("Yumurta (haşlanmış)", 155, 13, 1.1, 11),
  f("Yumurta (çiğ)", 143, 12.6, 0.7, 9.9),
  f("Yumurta akı (haşlanmış)", 52, 11, 0.7, 0.2),
  f("Tavuk göğsü (ızgara)", 165, 31, 0, 3.6),
  f("Tavuk göğsü (haşlanmış)", 150, 30, 0, 3),
  f("Tavuk but (fırında)", 209, 26, 0, 11),
  f("Tavuk kanat (fırında)", 203, 30, 0, 8),
  f("Hindi göğsü (ızgara)", 135, 30, 0, 1),
  f("Dana kıyma (az yağlı)", 176, 20, 0, 10),
  f("Dana biftek (ızgara)", 217, 26, 0, 12),
  f("Dana bonfile (ızgara)", 190, 28, 0, 8),
  f("Kuzu pirzola (ızgara)", 250, 25, 0, 16),
  f("Kuzu kuşbaşı (sote)", 230, 24, 2, 14),
  f("Köfte (ızgara)", 220, 18, 6, 14),
  f("Somon (fırında)", 208, 20, 0, 13),
  f("Somon (ızgara)", 200, 22, 0, 12),
  f("Levrek (fırında)", 97, 18, 0, 2.5),
  f("Çipura (ızgara)", 100, 20, 0, 2),
  f("Hamsi (tava)", 210, 19, 5, 13),
  f("Ton balığı (konserve, suda)", 116, 26, 0, 1),
  f("Karides (haşlanmış)", 99, 24, 0.2, 0.3),
  f("Whey protein tozu", 400, 80, 8, 6),
  f("Kazein protein tozu", 370, 75, 10, 4),

  // ── Süt ürünleri ──
  f("Tam yağlı süt", 61, 3.2, 4.8, 3.3),
  f("Yarım yağlı süt", 46, 3.4, 5, 1.5),
  f("Yağsız süt", 34, 3.4, 5, 0.1),
  f("Tam yağlı yoğurt", 61, 3.5, 4.7, 3.3),
  f("Yarım yağlı yoğurt", 48, 4, 6, 1),
  f("Süzme yoğurt", 97, 10, 3.6, 5),
  f("Kefir", 60, 3.3, 4.5, 3),
  f("Ayran", 33, 1.7, 2.4, 1.8),
  f("Beyaz peynir", 264, 17, 0.5, 21),
  f("Lor peyniri", 98, 11, 3.4, 4.3),
  f("Kaşar peyniri", 350, 25, 1, 27),
  f("Tulum peyniri", 300, 22, 1, 23),
  f("Çökelek", 72, 12, 2, 1.5),
  f("Labne", 210, 6, 4, 19),
  f("Mozzarella", 280, 28, 3, 17),
  f("Cottage cheese", 98, 11, 3.4, 4.3),
  f("Krema (çiğ)", 340, 2.1, 2.8, 36),

  // ── Tahıllar & baklagiller ──
  f("Beyaz pirinç (pişmiş)", 130, 2.7, 28, 0.3),
  f("Esmer pirinç (pişmiş)", 123, 2.7, 26, 1),
  f("Bulgur pilavı", 83, 3, 18, 0.2),
  f("Makarna (pişmiş)", 131, 5, 25, 1.1),
  f("Tam buğday makarna (pişmiş)", 124, 5.3, 25, 0.5),
  f("Yulaf ezmesi (kuru)", 389, 17, 66, 7),
  f("Yulaf ezmesi (pişmiş)", 68, 2.4, 12, 1.4),
  f("Granola", 471, 10, 64, 20),
  f("Tam buğday ekmeği", 247, 13, 41, 3.4),
  f("Beyaz ekmek", 265, 9, 49, 3.2),
  f("Çavdar ekmeği", 259, 8.5, 48, 3.3),
  f("Bazlama", 260, 8, 47, 4),
  f("Lavaş", 275, 9, 56, 1.2),
  f("Pide", 270, 8, 50, 4),
  f("Simit", 350, 10, 55, 10),
  f("Nohut (haşlanmış)", 164, 9, 27, 2.6),
  f("Kırmızı mercimek (pişmiş)", 116, 9, 20, 0.4),
  f("Yeşil mercimek (pişmiş)", 116, 9, 20, 0.4),
  f("Kuru fasulye (pişmiş)", 127, 8.7, 23, 0.5),
  f("Barbunya (pişmiş)", 143, 9, 26, 0.5),
  f("Mısır (haşlanmış)", 96, 3.4, 21, 1.5),

  // ── Sebzeler ──
  f("Domates", 18, 0.9, 3.9, 0.2),
  f("Salatalık", 15, 0.7, 3.6, 0.1),
  f("Biber (yeşil)", 20, 0.9, 4.6, 0.2),
  f("Biber (kırmızı)", 31, 1, 6, 0.3),
  f("Patlıcan (fırında)", 25, 1, 6, 0.2),
  f("Kabak (sote)", 24, 1.2, 5, 0.3),
  f("Brokoli (haşlanmış)", 35, 2.4, 7, 0.4),
  f("Karnabahar (haşlanmış)", 23, 1.8, 4.1, 0.5),
  f("Ispanak (haşlanmış)", 23, 2.9, 3.6, 0.4),
  f("Havuç", 41, 0.9, 10, 0.2),
  f("Marul", 15, 1.4, 2.9, 0.2),
  f("Soğan", 40, 1.1, 9, 0.1),
  f("Sarımsak", 149, 6.4, 33, 0.5),
  f("Patates (haşlanmış)", 87, 1.9, 20, 0.1),
  f("Tatlı patates (fırında)", 90, 2, 21, 0.1),
  f("Mantar (sote)", 28, 3.1, 4, 0.5),
  f("Bezelye (pişmiş)", 84, 5, 16, 0.4),
  f("Yeşil fasulye (sote)", 35, 1.8, 7, 0.3),

  // ── Meyveler ──
  f("Muz", 89, 1.1, 23, 0.3),
  f("Elma", 52, 0.3, 14, 0.2),
  f("Portakal", 47, 0.9, 12, 0.1),
  f("Mandalina", 53, 0.8, 13, 0.3),
  f("Çilek", 32, 0.7, 7.7, 0.3),
  f("Üzüm", 69, 0.7, 18, 0.2),
  f("Karpuz", 30, 0.6, 7.6, 0.2),
  f("Kavun", 34, 0.8, 8, 0.2),
  f("Şeftali", 39, 0.9, 10, 0.3),
  f("Kayısı", 48, 1.4, 11, 0.4),
  f("Kiraz", 50, 1, 12, 0.3),
  f("Armut", 57, 0.4, 15, 0.1),
  f("Erik", 46, 0.7, 11, 0.3),
  f("Avokado", 160, 2, 9, 15),
  f("Hurma (kuru)", 277, 1.8, 75, 0.2),
  f("İncir (taze)", 74, 0.8, 19, 0.3),
  f("İncir (kuru)", 249, 3.3, 64, 0.9),
  f("Kuru üzüm", 299, 3, 79, 0.5),

  // ── Kuruyemişler & yağlar ──
  f("Badem", 579, 21, 22, 50),
  f("Ceviz", 654, 15, 14, 65),
  f("Fındık", 628, 15, 17, 61),
  f("Antep fıstığı", 560, 20, 28, 45),
  f("Yer fıstığı", 567, 26, 16, 49),
  f("Fıstık ezmesi", 588, 25, 20, 50),
  f("Kaju", 553, 18, 30, 44),
  f("Zeytinyağı", 884, 0, 0, 100),
  f("Tereyağı", 717, 0.9, 0.1, 81),
  f("Ayçiçek yağı", 884, 0, 0, 100),
  f("Zeytin (yeşil)", 145, 1, 3.8, 15),
  f("Zeytin (siyah)", 115, 0.8, 6, 11),
  f("Tahini (tahin)", 595, 17, 21, 54),

  // ── İçecekler ──
  f("Türk kahvesi (şekersiz)", 2, 0.3, 0, 0),
  f("Çay (şekersiz)", 1, 0, 0.2, 0),
  f("Portakal suyu (taze)", 45, 0.7, 10, 0.2),
  f("Protein shake (1 ölçek + su)", 120, 24, 2, 1.5),
  f("Limonata (şekerli)", 40, 0.1, 10, 0),

  // ── Tatlılar & atıştırmalık ──
  f("Bal", 304, 0.3, 82, 0),
  f("Pekmez", 293, 1, 72, 0.3),
  f("Çikolata (bitter %70)", 598, 8, 46, 43),
  f("Çikolata (sütlü)", 535, 8, 60, 30),
  f("Baklava (cevizli)", 400, 8, 40, 25),
  f("Pirinç patlağı", 382, 8, 84, 1),
  f("Şeker (toz)", 387, 0, 100, 0),
  f("Reçel", 250, 0.3, 65, 0),

  // ── Yemekler (hazır) ──
  f("Menemen", 120, 7, 5, 8),
  f("Karnıyarık", 140, 8, 10, 8),
  f("İmam bayıldı", 100, 2, 10, 6),
  f("Mercimek çorbası", 56, 3, 9, 1),
  f("Tarhana çorbası", 60, 2.5, 10, 1),
  f("Ezogelin çorbası", 65, 3, 11, 1),
  f("Pilav (tereyağlı)", 150, 3, 26, 4),
  f("Kısır", 130, 3, 20, 5),
  f("Cacık", 40, 2, 3, 2),
  f("Lahmacun", 260, 10, 34, 10),
  f("Tantuni", 180, 15, 10, 9),
  f("Döner (tavuk)", 200, 22, 5, 10),
  f("Döner (et)", 230, 18, 5, 15),
  f("Tost (kaşarlı)", 290, 12, 28, 15),
  f("Börek (peynirli)", 300, 10, 30, 16),
];
