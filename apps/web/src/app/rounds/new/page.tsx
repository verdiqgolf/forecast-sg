'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function NewRoundPage() {
  const router = useRouter();
  const [course, setCourse] = useState('');
  const [datePlayed, setDatePlayed] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const canSave = course && datePlayed && !isSaving;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const { data, error } = await supabase
      .from('rounds')
      .insert({
        course_name: course,
        date_played: datePlayed,
      })
      .select('id')
      .single();

    setIsSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.replace(`/rounds/${data!.id}`);
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-3xl font-bold mb-6">New Round</h1>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Course name</label>
          <input
            className="w-full rounded border p-2"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="Franklin Country Club"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Date played</label>
          <input
            type="date"
            className="w-full rounded border p-2"
            value={datePlayed}
            onChange={(e) => setDatePlayed(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-2xl px-4 py-2 bg-black text-white disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Create round'}
        </button>
      </form>
    </div>
  );
}
