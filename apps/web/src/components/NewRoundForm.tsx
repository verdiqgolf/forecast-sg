"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewRoundForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr(null);

    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());

    const res = await fetch("/api/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setErr(json.error ?? "Failed to save");
      return;
    }

    // go to detail page or back to list
    router.push(`/rounds/${json.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      {err && <div className="text-red-400 text-sm">{err}</div>}

      <div>
        <label className="block text-sm mb-1">Course</label>
        <input name="course_name" required className="w-full rounded bg-gray-900 border border-gray-700 p-2" />
      </div>

      <div>
        <label className="block text-sm mb-1">Date played</label>
        <input name="date_played" type="date" required className="w-full rounded bg-gray-900 border border-gray-700 p-2" />
      </div>

      <div>
        <label className="block text-sm mb-1">Score</label>
        <input name="score" type="number" required className="w-full rounded bg-gray-900 border border-gray-700 p-2" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">SG (total)</label>
          <input name="strokes_gained_total" type="number" step="0.1" className="w-full rounded bg-gray-900 border border-gray-700 p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">SG (tee)</label>
          <input name="strokes_gained_tee" type="number" step="0.1" className="w-full rounded bg-gray-900 border border-gray-700 p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">SG (approach)</label>
          <input name="strokes_gained_approach" type="number" step="0.1" className="w-full rounded bg-gray-900 border border-gray-700 p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">SG (short)</label>
          <input name="strokes_gained_short" type="number" step="0.1" className="w-full rounded bg-gray-900 border border-gray-700 p-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">SG (putting)</label>
          <input name="strokes_gained_putting" type="number" step="0.1" className="w-full rounded bg-gray-900 border border-gray-700 p-2" />
        </div>
      </div>

      <button
        disabled={busy}
        className="rounded-lg px-4 py-2 bg-white/10 hover:bg-white/20 border border-gray-600"
      >
        {busy ? "Saving…" : "Save round"}
      </button>
    </form>
  );
}
