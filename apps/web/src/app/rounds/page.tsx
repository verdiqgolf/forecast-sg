export const revalidate = 0;

// apps/web/src/app/rounds/page.tsx
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import DeleteRoundButton from '@/components/rounds/DeleteRoundButton';
import SetHoleCount from '@/components/rounds/SetHoleCount';

type Round = {
  id: string;
  course_name: string | null;
  date_played: string;
  score: number | null;
  strokes_gained_total: number | null;
  hole_count: number | null;
  // SG components
  sg_putting: number | null;
  sg_offtee: number | null;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString();
}

function fmtSG(v: number | null | undefined) {
  if (v === null || v === undefined) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}`;
}

export default async function RoundsPage() {
  // Pull rounds, newest first
  const { data, error } = await supabase
    .from('rounds')
    .select(
      'id, course_name, date_played, score, strokes_gained_total, hole_count, sg_putting, sg_offtee'
    )
    .order('date_played', { ascending: false });

  if (error) {
    return (
      <div className="p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Rounds</h1>
          <div className="flex gap-2">
            <Link href="/dashboard" className="rounded-2xl px-4 py-2 border hover:bg-gray-50">
              Dashboard
            </Link>
            <Link href="/rounds/new" className="rounded-2xl px-4 py-2 border hover:bg-gray-50">
              + New Round
            </Link>
          </div>
        </div>
        <div className="text-red-600">Failed to load rounds: {error.message}</div>
      </div>
    );
  }

  const rounds: Round[] = data ?? [];

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Rounds</h1>
        <div className="flex gap-2">
          <Link href="/dashboard" className="rounded-2xl px-4 py-2 border hover:bg-gray-50">
            Dashboard
          </Link>
          <Link href="/rounds/new" className="rounded-2xl px-4 py-2 border hover:bg-gray-50">
            + New Round
          </Link>
        </div>
      </div>

      {!rounds.length ? (
        <div className="mt-4 text-yellow-600">No rounds returned.</div>
      ) : (
        <ul className="space-y-3">
          {rounds.map((r) => {
            const sgNum =
              typeof r.strokes_gained_total === 'number' ? r.strokes_gained_total : null;
            const sgClass =
              sgNum === null
                ? ''
                : sgNum > 0
                ? 'text-green-700'
                : sgNum < 0
                ? 'text-red-700'
                : '';

            return (
              <li key={r.id} className="rounded-xl border p-4">
                <div className="flex items-start gap-4">
                  <Link href={`/rounds/${r.id}`} className="flex-1">
                    <div className="font-semibold">{r.course_name || 'Untitled course'}</div>

                    {/* meta row with holes (inline setter if missing) */}
                    <div className="text-sm opacity-70 flex flex-wrap items-center gap-2">
                      <span>{fmtDate(r.date_played)}</span>
                      <span>•</span>
                      {r.hole_count ? (
                        <span>{r.hole_count} holes</span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <span className="opacity-70">Holes:</span>
                          <SetHoleCount id={r.id} />
                        </span>
                      )}
                      <span>•</span>
                      <span>Score: {r.score ?? '—'}</span>
                      <span>•</span>
                      <span className={sgClass}>SG: {fmtSG(sgNum)}</span>
                    </div>

                    <div className="text-xs opacity-60">
                      OTT {fmtSG(r.sg_offtee)} • PUTT {fmtSG(r.sg_putting)}
                    </div>
                  </Link>

                  {/* actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    <DeleteRoundButton id={r.id} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
