// Curated gym exercise library, tagged by the 4-phase periodized session model.
// Shared by the DB seed and the (template) program generator so slugs stay in sync.
// MET values are approximate metabolic equivalents used only for a motivational
// kcal estimate — they are NOT fed into the Dynamic TDEE model (that would double
// count, since TDEE is already learned from intake vs. weight change).

export type Phase = "activation" | "strength" | "functional" | "cardio" | "cooldown";
export type Unit = "reps" | "seconds" | "meters";

export interface ExerciseSeed {
  slug: string;
  name: string;
  phase: Phase;
  muscleGroup: "legs" | "push" | "pull" | "core" | "full" | "mobility" | "cardio";
  equipment:
    | "barbell"
    | "dumbbell"
    | "machine"
    | "cable"
    | "bodyweight"
    | "kettlebell"
    | "cardio_machine"
    | "foam_roller"
    | "band";
  met: number;
  unit: Unit;
  instructionTr?: string;
}

export const PHASE_LABEL: Record<Phase, string> = {
  activation: "1 · Hazırlık & Aktivasyon",
  strength: "2 · Ana Yüklenme — Kuvvet",
  functional: "2 · Ana Yüklenme — Fonksiyonel",
  cardio: "3 · Kardiyo",
  cooldown: "4 · Soğuma & Toparlanma",
};

export const PHASE_HINT: Record<Phase, string> = {
  activation: "MSS ve fasyayı uyandır — mobilite, SMR, dinamik esneme, düşük tempo kardiyo.",
  strength: "Full-body kuvvet — nöromusküler adaptasyon ve kas kütlesi.",
  functional: "Denge, patlayıcı kuvvet, koordinasyon ve stabilizasyon — atletik gelişim.",
  cardio: "Glikojen sonrası yağ oksidasyonu ve kondisyon.",
  cooldown: "Parasempatik geçiş — statik esneme + SMR ile kortizolü baskıla, toparlanmayı başlat.",
};

export const EXERCISE_LIBRARY: ExerciseSeed[] = [
  // ── Activation ──
  { slug: "foam-roll-full", name: "Foam Roller — sırt & bacak (SMR)", phase: "activation", muscleGroup: "mobility", equipment: "foam_roller", met: 3, unit: "seconds", instructionTr: "Her bölgede 30-45 sn yavaş yuvarla, gergin noktalarda dur." },
  { slug: "hip-opener-dynamic", name: "Dinamik kalça açıcı", phase: "activation", muscleGroup: "mobility", equipment: "bodyweight", met: 3.5, unit: "reps", instructionTr: "World's greatest stretch — kontrollü, her yönde tam açı." },
  { slug: "band-shoulder-dislocate", name: "Bant omuz mobilizasyonu", phase: "activation", muscleGroup: "mobility", equipment: "band", met: 3, unit: "reps", instructionTr: "Bantı önden arkaya geniş kavrayışla geçir, omuzları aç." },
  { slug: "incline-walk", name: "Eğimli yürüyüş (ısınma)", phase: "activation", muscleGroup: "cardio", equipment: "cardio_machine", met: 4.3, unit: "seconds", instructionTr: "%6-8 eğim, düşük tempo — nabzı kademeli yükselt." },
  { slug: "elliptical-warmup", name: "Eliptik ısınma", phase: "activation", muscleGroup: "cardio", equipment: "cardio_machine", met: 4.5, unit: "seconds", instructionTr: "Düşük dirençte akıcı tempo, eklemleri ısıt." },
  { slug: "leg-swings", name: "Bacak salınımı (dinamik)", phase: "activation", muscleGroup: "mobility", equipment: "bodyweight", met: 3.2, unit: "reps", instructionTr: "Öne-arkaya ve yana kontrollü salınım." },

  // ── Strength (A day, full body) ──
  { slug: "back-squat", name: "Barbell Squat", phase: "strength", muscleGroup: "legs", equipment: "barbell", met: 6, unit: "reps", instructionTr: "Kalça-diz aynı anda, sırt nötr, paralelin altına in." },
  { slug: "bench-press", name: "Bench Press", phase: "strength", muscleGroup: "push", equipment: "barbell", met: 6, unit: "reps", instructionTr: "Kürek kemikleri sıkışık, bar göğse kontrollü, patlayıcı it." },
  { slug: "barbell-row", name: "Barbell Row", phase: "strength", muscleGroup: "pull", equipment: "barbell", met: 6, unit: "reps", instructionTr: "Kalçadan menteşe, sırtı çek, barı karına doğru." },
  { slug: "romanian-deadlift", name: "Romanian Deadlift", phase: "strength", muscleGroup: "legs", equipment: "barbell", met: 6, unit: "reps", instructionTr: "Hamstring gerilene kadar kalçadan aç, sırt nötr." },
  { slug: "overhead-press", name: "Overhead Press", phase: "strength", muscleGroup: "push", equipment: "barbell", met: 6, unit: "reps", instructionTr: "Karın sıkı, barı baş üstüne dik hat üzerinde it." },
  { slug: "lat-pulldown", name: "Lat Pulldown", phase: "strength", muscleGroup: "pull", equipment: "cable", met: 5, unit: "reps", instructionTr: "Göğüs yukarı, dirsekleri yanına çek, sırtı sık." },
  { slug: "leg-press", name: "Leg Press", phase: "strength", muscleGroup: "legs", equipment: "machine", met: 5.5, unit: "reps", instructionTr: "Ayaklar omuz genişliği, dizleri kilitleme." },
  { slug: "seated-cable-row", name: "Seated Cable Row", phase: "strength", muscleGroup: "pull", equipment: "cable", met: 5, unit: "reps", instructionTr: "Gövde sabit, kürek kemiklerini sıkıştır." },
  { slug: "incline-db-press", name: "Incline Dumbbell Press", phase: "strength", muscleGroup: "push", equipment: "dumbbell", met: 5.5, unit: "reps", instructionTr: "30° eğim, dumbbell'ları kontrollü indir-çıkar." },
  { slug: "walking-lunge", name: "Dumbbell Walking Lunge", phase: "strength", muscleGroup: "legs", equipment: "dumbbell", met: 5.5, unit: "reps", instructionTr: "Uzun adım, arka diz yere yakın, gövde dik." },

  // ── Functional (B day, full body) ──
  { slug: "kb-swing", name: "Kettlebell Swing", phase: "functional", muscleGroup: "full", equipment: "kettlebell", met: 7, unit: "reps", instructionTr: "Patlayıcı kalça itişi, kol sadece salınır, karın kilitli." },
  { slug: "box-jump", name: "Box Jump", phase: "functional", muscleGroup: "legs", equipment: "bodyweight", met: 7, unit: "reps", instructionTr: "İki ayakla patla, kutuya yumuşak in, kontrollü geri dön." },
  { slug: "bulgarian-split-squat", name: "Bulgarian Split Squat", phase: "functional", muscleGroup: "legs", equipment: "dumbbell", met: 6, unit: "reps", instructionTr: "Arka ayak yükseltilmiş, tek bacak denge + stabilizasyon." },
  { slug: "med-ball-slam", name: "Medicine Ball Slam", phase: "functional", muscleGroup: "core", equipment: "bodyweight", met: 7, unit: "reps", instructionTr: "Baş üstünden patlayıcı yere vur, tüm gövdeyi kullan." },
  { slug: "farmer-carry", name: "Farmer's Carry", phase: "functional", muscleGroup: "full", equipment: "dumbbell", met: 5.5, unit: "meters", instructionTr: "Ağır dumbbell, dik duruş, sıkı karın, sabit tempo yürü." },
  { slug: "single-leg-rdl", name: "Single-Leg RDL", phase: "functional", muscleGroup: "legs", equipment: "dumbbell", met: 5.5, unit: "reps", instructionTr: "Tek bacak denge, kalçadan menteşe, sırt nötr." },
  { slug: "battle-rope", name: "Battle Rope", phase: "functional", muscleGroup: "full", equipment: "cardio_machine", met: 8, unit: "seconds", instructionTr: "Dizler yumuşak, patlayıcı dalgalar, karın kilitli." },
  { slug: "pallof-press", name: "Pallof Press (anti-rotasyon)", phase: "functional", muscleGroup: "core", equipment: "cable", met: 4.5, unit: "reps", instructionTr: "Kabloya dik dur, rotasyona direnç göster, kolları uzat-çek." },
  { slug: "goblet-squat-jump", name: "Goblet Squat + patlama", phase: "functional", muscleGroup: "legs", equipment: "kettlebell", met: 7, unit: "reps", instructionTr: "Goblet pozisyonda in, patlayıcı çık." },

  // ── Cardio ──
  { slug: "treadmill-run", name: "Koşu bandı", phase: "cardio", muscleGroup: "cardio", equipment: "cardio_machine", met: 9, unit: "seconds", instructionTr: "Orta-yüksek tempo, konuşamayacağın eşiğin hemen altında tut." },
  { slug: "rower", name: "Kürek (rower)", phase: "cardio", muscleGroup: "cardio", equipment: "cardio_machine", met: 8, unit: "seconds", instructionTr: "Bacak-gövde-kol sırası; güçlü çekiş, kontrollü dönüş." },
  { slug: "stair-climber", name: "Merdiven (stair climber)", phase: "cardio", muscleGroup: "cardio", equipment: "cardio_machine", met: 8.5, unit: "seconds", instructionTr: "Dik duruş, tutamağa yaslanma, sabit basamak temposu." },
  { slug: "jump-rope", name: "Atlama ipi", phase: "cardio", muscleGroup: "cardio", equipment: "bodyweight", met: 11, unit: "seconds", instructionTr: "Bileklerden çevir, alçak sıçra, ritim tut." },

  // ── Cooldown ──
  { slug: "static-hamstring", name: "Statik hamstring esnetme", phase: "cooldown", muscleGroup: "mobility", equipment: "bodyweight", met: 2.3, unit: "seconds", instructionTr: "Nefesle derinleş, 30-45 sn sabit tut, zıplama yok." },
  { slug: "static-hipflexor", name: "Statik kalça fleksör esnetme", phase: "cooldown", muscleGroup: "mobility", equipment: "bodyweight", met: 2.3, unit: "seconds", instructionTr: "Diz yerde, kalçayı öne it, gövde dik." },
  { slug: "static-chest", name: "Statik göğüs/omuz esnetme", phase: "cooldown", muscleGroup: "mobility", equipment: "bodyweight", met: 2.3, unit: "seconds", instructionTr: "Kolu duvara ver, gövdeyi karşı yöne çevir." },
  { slug: "foam-roll-cooldown", name: "Foam Roller — çalışan kaslar (SMR)", phase: "cooldown", muscleGroup: "mobility", equipment: "foam_roller", met: 2.5, unit: "seconds", instructionTr: "Yorulan bölgeleri yavaşça yuvarla, derin nefes al." },
  { slug: "box-breathing", name: "Kutu nefesi (4-4-4-4)", phase: "cooldown", muscleGroup: "mobility", equipment: "bodyweight", met: 1.5, unit: "seconds", instructionTr: "4 sn al, 4 sn tut, 4 sn ver, 4 sn bekle — parasempatik geçiş." },
];

export const LIBRARY_BY_SLUG = Object.fromEntries(EXERCISE_LIBRARY.map((e) => [e.slug, e]));
