"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommentView {
  id: string;
  authorRole: string; // coach | client
  body: string;
  createdAt: string;
}

export function CoachComments({
  clientId,
  comments,
  viewerRole,
}: {
  clientId: string;
  comments: CommentView[];
  viewerRole: "coach" | "client";
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      const res = await fetch("/api/coach/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, body }),
      });
      if (res.ok) {
        setText("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.length === 0 && <p className="text-sm text-ink-3">Henüz mesaj yok.</p>}
      {comments.map((c) => {
        const mine = c.authorRole === viewerRole;
        return (
          <div key={c.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                mine ? "bg-primary text-white" : "bg-surface-2 text-ink",
              )}
            >
              <div className={cn("mb-0.5 text-[0.65rem] font-semibold", mine ? "text-white/70" : "text-ink-3")}>
                {c.authorRole === "coach" ? "Koç" : "Danışan"} ·{" "}
                {new Date(c.createdAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{c.body}</div>
            </div>
          </div>
        );
      })}

      <div className="mt-1 flex items-end gap-2">
        <textarea
          className="input min-h-[44px] resize-y"
          placeholder="Mesaj yaz…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
        />
        <button className="btn btn-primary shrink-0" onClick={send} disabled={busy || !text.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Gönder
        </button>
      </div>
    </div>
  );
}
