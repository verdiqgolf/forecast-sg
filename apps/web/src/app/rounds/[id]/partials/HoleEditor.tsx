'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import VoiceMemo from '@/components/VoiceMemo';

type Lie =
  | 'tee'
  | 'fairway'
  | 'rough'
  | 'sand'
  | 'recovery'
  | 'green'
  | 'penalty'
  | 'holed';

type Hole = {
  id: string;
  number: number;
  par: number | null;
  strokes: number | null;
  notes: string | null;
  audio_url: string | null;
  transcript: string | null;

  // true-SG inputs (yards schema)
  start_lie?: Lie | null;
  start_distance_y?: number | null;
  end_lie?: Lie | null;
  end_distance_y?: number | null;
  putts?: number | null;
};

function parseNumOrNull(v: string): number | null {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function HoleEditor({
  roundId,
  existing,
}: {
  roundId: string;
  existing: Hole[];
}) {
  const [holes, setHoles] = useState<Hole[]>(
    existing.length
      ? existing
      : Array.from({ length: 18 }, (_, i) => ({
          id: crypto.randomUUID(),
          number: i + 1,
          par: null,
          strokes: null,
          notes: '',
          audio_url: null,
          transcript: null,
          start_lie: null,
          start_distance_y: null,
          end_lie: null,
          end_distance_y: null,
          putts: null,
        }))
  );
  const [saving, setSaving] = useState(false);

  function saveHole(idx: number, patch: Partial<Hole>) {
    setHoles((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  async function upsertHole(h: Hole) {
    const payload = {
      round_id: roundId,
      number: h.number,
      par: h.par,
      strokes: h.strokes,
      notes: h.notes,
      audio_url: h.audio_url,
      transcript: h.transcript,
      start_lie: h.start_lie ?? null,
      start_distance_y: h.start_distance_y ?? null,
      end_lie: h.end_lie ?? null,
      end_distance_y: h.end_distance_y ?? null,
      putts: h.putts ?? null,
    };

    const { error } = await supabase
      .from('holes')
      .upsert(payload, { onConflict: 'round_id,number' });

    if (error) throw error;
  }

  async function saveAll() {
    setSaving(true);
    try {
      // 1) upsert all holes
      for (const h of holes) await upsertHole(h);

      // 2) compute total strokes (score) locally
      const totalStrokes = holes.reduce(
        (sum, h) => sum + (typeof h.strokes === 'number' ? h.strokes : 0),
        0
      );

      // 3) update round score (SG total is handled by DB trigger)
      const { error: roundErr } = await supabase
        .from('rounds')
        .update({ score: totalStrokes })
        .eq('id', roundId);

      if (roundErr) throw roundErr;

      alert(`Saved. Round score set to ${totalStrokes}.`);
    } catch (e: any) {
      alert(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {holes.map((h, idx) => (
        <div key={h.number} className="rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="font-semibold text-lg">Hole {h.number}</div>

            <label className="text-sm">
              Par:{' '}
              <input
                type="number"
                className="w-16 rounded border p-1"
                value={h.par ?? ''}
                onChange={(e) => saveHole(idx, { par: parseNumOrNull(e.target.value) })}
              />
            </label>

            <label className="text-sm">
              Strokes:{' '}
              <input
                type="number"
                className="w-16 rounded border p-1"
                value={h.strokes ?? ''}
                onChange={(e) =>
                  saveHole(idx, { strokes: parseNumOrNull(e.target.value) })
                }
              />
            </label>
          </div>

          {/* True SG inputs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="text-sm">
              Start lie
              <select
                className="w-full rounded border p-1"
                value={h.start_lie ?? ''}
                onChange={(e) =>
                  saveHole(idx, {
                    start_lie: (e.target.value || null) as Hole['start_lie'],
                  })
                }
              >
                <option value="">—</option>
                <option value="tee">Tee</option>
                <option value="fairway">Fairway</option>
                <option value="rough">Rough</option>
                <option value="sand">Sand</option>
                <option value="recovery">Recovery</option>
                <option value="green">Green</option>
                <option value="penalty">Penalty</option>
              </select>
            </label>

            <label className="text-sm">
              Start dist (yd)
              <input
                type="number"
                step="1"
                className="w-full rounded border p-1"
                value={h.start_distance_y ?? ''}
                onChange={(e) =>
                  saveHole(idx, {
                    start_distance_y: parseNumOrNull(e.target.value),
                  })
                }
              />
            </label>

            <label className="text-sm">
              End lie
              <select
                className="w-full rounded border p-1"
                value={h.end_lie ?? ''}
                onChange={(e) =>
                  saveHole(idx, {
                    end_lie: (e.target.value || null) as Hole['end_lie'],
                  })
                }
              >
                <option value="">—</option>
                <option value="holed">Holed</option>
                <option value="green">Green</option>
                <option value="fairway">Fairway</option>
                <option value="rough">Rough</option>
                <option value="sand">Sand</option>
                <option value="recovery">Recovery</option>
                <option value="penalty">Penalty</option>
              </select>
            </label>

            <label className="text-sm">
              End dist (yd)
              <input
                type="number"
                step="1"
                className="w-full rounded border p-1"
                value={h.end_distance_y ?? ''}
                onChange={(e) =>
                  saveHole(idx, {
                    end_distance_y: parseNumOrNull(e.target.value),
                  })
                }
                disabled={h.end_lie === 'holed'}
              />
            </label>

            {h.start_lie === 'green' && (
              <label className="text-sm col-span-2 md:col-span-1">
                Putts
                <input
                  type="number"
                  className="w-20 rounded border p-1"
                  value={h.putts ?? ''}
                  onChange={(e) =>
                    saveHole(idx, { putts: parseNumOrNull(e.target.value) })
                  }
                />
              </label>
            )}
          </div>

          <textarea
            className="w-full rounded border p-2"
            placeholder="Notes (club, wind, lie, target…)"
            value={h.notes ?? ''}
            onChange={(e) => saveHole(idx, { notes: e.target.value })}
          />

          <VoiceMemo
            onUploaded={(audio_url, transcript) =>
              saveHole(idx, {
                audio_url,
                transcript,
                notes: h.notes || transcript,
              })
            }
          />

          {h.audio_url ? <audio controls src={h.audio_url} className="w-full" /> : null}
          {h.transcript ? (
            <div className="text-sm opacity-70">Transcript: {h.transcript}</div>
          ) : null}
        </div>
      ))}

      <button
        onClick={saveAll}
        disabled={saving}
        className="rounded-2xl px-4 py-2 bg-black text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save All'}
      </button>
    </div>
  );
}
