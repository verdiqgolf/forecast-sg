// apps/web/src/components/rounds/SetHoleCount.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function SetHoleCount({ id }: { id: string }) {
  const [value, setValue] = useState<'9' | '18' | ''>('');
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const save = async () => {
    if (value !== '9' && value !== '18') return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rounds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hole_count: Number(value) }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to update');
      }
      startTransition(() => router.refresh());
    } catch (e: any) {
      alert(e.message || 'Failed to update hole count.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value as '9' | '18' | '')}
        className="rounded-lg border px-2 py-1"
        aria-label="Set hole count"
      >
        <option value="">Set holes…</option>
        <option value="9">9</option>
        <option value="18">18</option>
      </select>
      <button
        onClick={save}
        disabled={!value || busy || pending}
        className="px-2 py-1 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
      >
        Save
      </button>
    </div>
  );
}
