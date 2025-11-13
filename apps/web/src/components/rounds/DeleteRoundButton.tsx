'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function DeleteRoundButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = async () => {
    if (!confirm('Delete this round? This cannot be undone.')) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/rounds/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Delete failed (${res.status})`);
      }

      // Optimistic UI refresh
      startTransition(() => router.refresh());
    } catch (e: any) {
      alert(e.message || 'Failed to delete.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onDelete}
      disabled={busy || pending}
      className="px-3 py-1 rounded-lg border border-red-500 text-red-500 
                 hover:bg-red-500/10 disabled:opacity-60 text-sm"
      title="Delete round"
    >
      {busy || pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
