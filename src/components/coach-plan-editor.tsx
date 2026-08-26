"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Save } from "lucide-react";

export function CoachPlanEditor({
  clientId,
  current,
}: {
  clientId: string;
  current: { title: string; body: string } | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(current?.title ?? "");
  const [body, setBody] = useState(current?.body ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    if (!title.trim() || !body.trim()) return;
    setState("saving");
    const res = await fetch("/api/coach/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, title, body }),
    });
    if (res.ok) {
      setState("saved");
      router.refresh();
    } else {
      setState("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="block">
        <span className="label">Plan başlığı</span>
        <input
          className="input"
          placeholder="Örn: Hafta 1 — Üst vücut + kardiyo"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setState("idle"); }}
        />
      </label>
      <label className="block">
        <span className="label">Plan içeriği</span>
        <textarea
          className="input min-h-[180px] resize-y leading-relaxed"
          placeholder={"Gün gün program, setler, notlar…"}
          value={body}
          onChange={(e) => { setBody(e.target.value); setState("idle"); }}
        />
      </label>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={save} disabled={state === "saving" || !title.trim() || !body.trim()}>
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {state === "saved" ? "Kaydedildi" : "Planı yayınla"}
        </button>
        <span className="text-xs text-ink-3">Yeni plan yayınlanınca danışanın "Planım" ekranında görünür; önceki plan arşive alınır.</span>
      </div>
    </div>
  );
}
