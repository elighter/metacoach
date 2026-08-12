"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Check } from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  dob: string; // yyyy-mm-dd
  sex: string;
  heightCm: number | "";
  activityBase: string;
  goal: string;
  unitPref: string;
  locale: string;
}

const ACTIVITY = [
  ["sedentary", "Hareketsiz"],
  ["light", "Az aktif"],
  ["moderate", "Orta"],
  ["active", "Aktif"],
  ["athlete", "Sporcu"],
];
const GOALS = [
  ["cut", "Yağ kaybı"],
  ["maintain", "Koruma"],
  ["bulk", "Kas kazanımı"],
];

export function ProfileForm({ initial }: { initial: ProfileData }) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileData>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  function set<K extends keyof ProfileData>(k: K, v: ProfileData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setState("idle");
  }

  async function save() {
    setState("saving");
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        dob: form.dob || null,
        sex: form.sex || null,
        heightCm: form.heightCm === "" ? null : Number(form.heightCm),
        activityBase: form.activityBase,
        goal: form.goal,
        unitPref: form.unitPref,
        locale: form.locale,
      }),
    });
    setState("saved");
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <L label="Ad Soyad"><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></L>
        <L label="E-posta"><input className="input opacity-60" value={form.email} disabled /></L>
        <L label="Doğum tarihi"><input type="date" className="input" value={form.dob} onChange={(e) => set("dob", e.target.value)} /></L>
        <L label="Cinsiyet">
          <select className="input" value={form.sex} onChange={(e) => set("sex", e.target.value)}>
            <option value="male">Erkek</option>
            <option value="female">Kadın</option>
            <option value="other">Diğer</option>
          </select>
        </L>
        <L label="Boy (cm)"><input type="number" className="input" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value === "" ? "" : Number(e.target.value))} /></L>
        <L label="Aktivite düzeyi">
          <select className="input" value={form.activityBase} onChange={(e) => set("activityBase", e.target.value)}>
            {ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </L>
        <L label="Hedef">
          <select className="input" value={form.goal} onChange={(e) => set("goal", e.target.value)}>
            {GOALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </L>
        <L label="Birim">
          <select className="input" value={form.unitPref} onChange={(e) => set("unitPref", e.target.value)}>
            <option value="metric">Metrik (kg, cm)</option>
            <option value="imperial">Imperial (lb, in)</option>
          </select>
        </L>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button className="btn btn-primary" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {state === "saved" ? "Kaydedildi" : "Kaydet"}
        </button>
        <span className="text-xs text-ink-3">Bilgiler profilinde saklanır ve TDEE hesabında kullanılır.</span>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
