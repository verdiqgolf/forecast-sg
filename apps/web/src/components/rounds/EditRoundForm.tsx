'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Round = {
  id: string;
  date_played: string;
  course_name: string | null;
  hole_count: number | null;
  score: number | null;
  strokes_gained_total: number | null;
  sg_offtee: number | null;
  sg_approach: number | null;
  sg_short: number | null;
  sg_putting: number | null;
};

const toNumOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

export default function EditRoundForm({ round }: { round: Round }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const [date_played, setDate] = useState(round.date_played);
  const [course_name, setCourse] = useState(round.course_name ?? '');
  const [hole_count, setHoles] = useState<'' | 9 | 18>((round.hole_count as 9 | 18) ?? '');
  const [score, setScore] = useState(round.score?.toString() ?? '');

  const [off, setOff] = useState(round.sg_offtee?.toString() ?? '');
  const [app, setApp] = useState(round.sg_approach?.toString() ?? '');
  const [sho, setSho] = useState(round.sg_short?.toString() ?? '');
  const [put, setPut] = useState(round.sg_putting?.toString() ?? '');

  const [total, setTotal] = useState(round.strokes_gained_total?.toString() ?? '');

  // Sum components to 1 decimal; treat blanks as 0
  const sumComponents = useMemo(() => {
    const s = [off, app, sho, put]
      .map((v) => Number(v === '' ? 0 : v))
      .reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    return Number(s.toFixed(1));
  }, [off, app, sho, put]);

  const diff = useMemo(() => {
    if (total === '') return 0;
    const d = Number((sumComponents - Number(total)).toFixed(1));
    return Object.is(d, -0) ? 0 : d;
  }, [sumComponents, total]);

  const onRecalcTotal = () => setTotal(String(sumComponents));

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/rounds/${round.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_played,
          course_name: course_name || null,
          hole_count: hole_count === '' ? null : hole_count,
          score: toNumOrNull(score),
          sg_offtee: toNumOrNull(off),
          sg_approach: toNumOrNull(app),
          sg_short: toNumOrNull(sho),
          sg_putting: toNumOrNull(put),
          // If you leave total blank, API auto-calcs from components
          strokes_gained_total: toNumOrNull(total),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to save');
      }
      startTransition(() => router.refresh());
    } catch (e: any) {
      alert(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <label className="flex flex-col text-sm">Date
        <input
          type="date"
          value={date_played}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl p-2 border"
        />
      </label>

      <label className="flex flex-col text-sm">Course
        <input
          value={course_name}
          onChange={(e) => setCourse(e.target.value)}
          className="rounded-xl p-2 border"
        />
      </label>

      <label className="flex flex-col text-sm">Holes
        <select
          value={hole_count ?? ''}
          onChange={(e) =>
            setHoles((e.target.value === '' ? '' : Number(e.target.value)) as 9 | 18 | '')
          }
          className="rounded-xl p-2 border"
        >
          <option value="">—</option>
          <option value="9">9</option>
          <option value="18">18</option>
        </select>
      </label>

      <label className="flex flex-col text-sm">Score
        <input
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="rounded-xl p-2 border"
        />
      </label>

      <label className="flex flex-col text-sm">SG Off-tee
        <input
          type="number"
          step="0.1"
          value={off}
          onChange={(e) => setOff(e.target.value)}
          className="rounded-xl p-2 border"
        />
      </label>

      <label className="flex flex-col text-sm">SG Approach
        <input
          type="number"
          step="0.1"
          value={app}
          onChange={(e) => setApp(e.target.value)}
          className="rounded-xl p-2 border"
        />
      </label>

      <label className="flex flex-col text-sm">SG Short
        <input
          type="number"
          step="0.1"
          value={sho}
          onChange={(e) => setSho(e.target.value)}
          className="rounded-xl p-2 border"
        />
      </label>

      <label className="flex flex-col text-sm">SG Putting
        <input
          type="number"
          step="0.1"
          value={put}
          onChange={(e) => setPut(e.target.value)}
          className="rounded-xl p-2 border"
        />
      </label>

      <div className="md:col-span-2 flex flex-col gap-1">
        <label className="flex flex-col text-sm">SG Total
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="rounded-xl p-2 border flex-1"
            />
            <button
              type="button"
              onClick={onRecalcTotal}
              className="px-3 py-2 rounded-xl border hover:bg-gray-50"
            >
              Recalc from components ({sumComponents})
            </button>
          </div>
          {!!diff && (
            <span className="text-xs opacity-70">
              Note: components sum differs from total by {diff > 0 ? '+' : ''}{diff}.
            </span>
          )}
        </label>
      </div>

      <div className="md:col-span-2 flex gap-2">
        <button
          onClick={onSave}
          disabled={saving || pending}
          className="rounded-xl px-4 py-2 border hover:bg-gray-50 disabled:opacity-60"
        >
          {saving || pending ? 'Saving…' : 'Save'}
        </button>
        <a
          href="/rounds"
          className="rounded-xl px-4 py-2 border hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </div>
  );
}
