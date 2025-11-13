'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function DeleteRoundButton({ roundId }: { roundId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm('Delete this round and all its holes? This cannot be undone.')) return;
    setBusy(true);
    const { error } = await supabase.from('rounds').delete().eq('id', roundId);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.replace('/rounds');
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="rounded-2xl px-4 py-2 border text-red-600 border-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? 'Deleting…' : 'Delete Round'}
    </button>
  );
}
