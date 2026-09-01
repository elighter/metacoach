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
  { slug: "roll-up-ball", name: "Roll Up with Ball", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 3.5, unit: "reps", instructionTr: "Top ile spinal mobilizasyon + core kontrolü." },
  { slug: "banded-single-leg-circle", name: "Banded Single Leg Circle", phase: "activation", muscleGroup: "mobility", equipment: "band", met: 3.5, unit: "reps", instructionTr: "Bant direnciyle kalça mobilizasyonu + pelvik kontrol." },
  { slug: "dead-bug-ball", name: "Dead Bug with Ball + Alternating Leg Extension", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 3.5, unit: "reps", instructionTr: "Sırt yere yapışık, karşı kol-bacak uzat, core stabil." },
  { slug: "seated-single-leg-lift", name: "Seated Alternating Single Leg Lift", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 3, unit: "reps", instructionTr: "Oturarak tek bacak kaldırma — kalça fleksör + pelvis stabilitesi." },
  { slug: "quadruped-knee-ext", name: "Quadruped Resisted Knee Extension", phase: "activation", muscleGroup: "core", equipment: "band", met: 3.5, unit: "reps", instructionTr: "Dört ayak pozisyonda dirençli diz ekstansiyonu." },
  { slug: "quadruped-hip-ext", name: "Quadruped Resisted Hip Extension", phase: "activation", muscleGroup: "core", equipment: "band", met: 3.5, unit: "reps", instructionTr: "Dört ayak pozisyonda dirençli kalça ekstansiyonu — glute + pelvik stabil." },
  { slug: "marching-bridge", name: "Marching Bridge", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 4, unit: "reps", instructionTr: "Köprü pozisyonunda yürüme — glute + pelvik stabilizasyon." },
  { slug: "bird-dog", name: "Bird Dog", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 3.5, unit: "reps", instructionTr: "Karşı kol-bacak uzatma — koordinasyon + denge + core." },
  { slug: "overhead-ball-knee-drive", name: "Overhead Ball Knee Drive", phase: "activation", muscleGroup: "core", equipment: "bodyweight", met: 4, unit: "reps", instructionTr: "Top baş üstünde, diz çekme — dinamik denge + koordinasyon + core." },

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
  { slug: "upper-back-row", name: "Upper Back Row", phase: "strength", muscleGroup: "pull", equipment: "machine", met: 5, unit: "reps", instructionTr: "Üst sırt + trapez — skapular kontrol." },
  { slug: "back-extension", name: "Back Extension", phase: "strength", muscleGroup: "pull", equipment: "bodyweight", met: 4.5, unit: "reps", instructionTr: "Bel + glute + hamstring — posterior chain." },
  { slug: "rear-delt-fly", name: "Rear Delt Fly", phase: "strength", muscleGroup: "pull", equipment: "dumbbell", met: 4, unit: "reps", instructionTr: "Arka omuz + üst sırt — omuz stabilizasyonu." },
  { slug: "chest-fly", name: "Chest Fly", phase: "strength", muscleGroup: "push", equipment: "dumbbell", met: 4.5, unit: "reps", instructionTr: "Göğüs izolasyonu — kontrollü açma-kapama." },
  { slug: "lateral-raise", name: "Lateral Raise", phase: "strength", muscleGroup: "push", equipment: "dumbbell", met: 4, unit: "reps", instructionTr: "Orta omuz kuvveti — dumbbell yana kaldırma." },
  { slug: "preacher-curl", name: "Preacher Curl", phase: "strength", muscleGroup: "pull", equipment: "dumbbell", met: 4, unit: "reps", instructionTr: "Biceps + brachialis — destek sehpada izole curl." },
  { slug: "triceps-pushdown", name: "Triceps Pushdown", phase: "strength", muscleGroup: "push", equipment: "cable", met: 4, unit: "reps", instructionTr: "Triceps izolasyonu — kablo ile aşağı itme." },

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
  { slug: "squat-shoulder-press", name: "Squat + Shoulder Press", phase: "functional", muscleGroup: "full", equipment: "dumbbell", met: 6.5, unit: "reps", instructionTr: "Squat + dikey itiş — tüm vücut bileşik hareket." },
  { slug: "burpee", name: "Burpee", phase: "functional", muscleGroup: "full", equipment: "bodyweight", met: 8, unit: "reps", instructionTr: "Squat + push + jump — tüm vücut kondisyonu ve çeviklik." },
  { slug: "dips", name: "Dips", phase: "functional", muscleGroup: "push", equipment: "bodyweight", met: 6, unit: "reps", instructionTr: "Triceps, göğüs ve omuz kuşağı kuvveti." },
  { slug: "push-up", name: "Push-Up", phase: "functional", muscleGroup: "push", equipment: "bodyweight", met: 5.5, unit: "reps", instructionTr: "Göğüs, triceps, ön omuz ve core stabilizasyonu." },
  { slug: "pull-up", name: "Pull-Up", phase: "functional", muscleGroup: "pull", equipment: "bodyweight", met: 7, unit: "reps", instructionTr: "Lat, biceps, skapular kontrol ve kavrama kuvveti." },
  { slug: "sit-up", name: "Sit-Up", phase: "functional", muscleGroup: "core", equipment: "bodyweight", met: 5, unit: "reps", instructionTr: "Gövde fleksiyonu, abdominal kuvvet ve gövde kontrolü." },
  { slug: "lunge-lateral-raise", name: "Lunge + Lateral Raise", phase: "functional", muscleGroup: "full", equipment: "dumbbell", met: 6, unit: "reps", instructionTr: "Tek taraflı alt ekstremite + omuz — denge ve koordinasyon." },
  { slug: "step-up-knee-ohp", name: "Step-Up + Knee Drive + Overhead Press", phase: "functional", muscleGroup: "full", equipment: "dumbbell", met: 6.5, unit: "reps", instructionTr: "Unilateral bacak + dikey itiş — denge, koordinasyon, overhead stabil." },
  { slug: "jump-squat", name: "Jump Squat", phase: "functional", muscleGroup: "legs", equipment: "bodyweight", met: 7.5, unit: "reps", instructionTr: "Alt ekstremite patlayıcı güç — derin squat + sıçrama." },

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
