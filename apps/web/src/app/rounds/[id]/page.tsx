// apps/web/src/app/rounds/[id]/page.tsx
export const revalidate = 0;

import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import HoleEditor from './partials/HoleEditor';
import Link from 'next/link';
import DeleteRoundButton from '@/components/rounds/DeleteRoundButton';
import EditRoundForm from '@/components/rounds/EditRoundForm'; // ← NEW

type Props = { params: Promise<{ id: string }> };

export default async function RoundDetailPage({ params }: Props) {
  const { id: roundId } = await params;

  const [{ data: round, error: roundErr }, { data: holes, error: holesErr }] =
    await Promise.all([
      supabase
        .from('rounds')
        .select(
          'id, date_played, course_name, hole_count, score, strokes_gained_total, sg_putting, sg_short, sg_approach, sg_offtee'
        )
        .eq('id', roundId)
        .single(),
      supabase
        .from('holes')
        .select('*')
        .eq('round_id', roundId)
        .order('number', { ascending: true }),
    ]);

  if (roundErr || !round) {
    // If you added not-found.tsx, you can use: notFound();
    return (
      <div className="p-8 space-y-4">
        <Link href="/rounds" className="underline">
          ← Back to rounds
        </Link>
        <div className="text-red-600">{roundErr?.message ?? 'Round not found.'}</div>
      </div>
    );
  }

  const sg =
    typeof round.strokes_gained_total === 'number'
      ? round.strokes_gained_total.toFixed(1)
      : null;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{round.course_name}</h1>
          <p className="opacity-70">
            {new Date(round.date_played).toLocaleDateString()}
            {sg !== null && (
              <>
                {' '}· <span className="font-medium">SG (vs par):</span>{' '}
                <span
                  className={
                    Number(sg) > 0
                      ? 'text-green-600'
                      : Number(sg) < 0
                      ? 'text-red-600'
                      : ''
                  }
                >
                  {Number(sg) > 0 ? '+' : ''}
                  {sg}
                </span>
              </>
            )}
          </p>

          {/* SG pills */}
          {typeof round.strokes_gained_total === 'number' && (
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <Pill label="Off-tee" value={round.sg_offtee} />
              <Pill label="Approach" value={round.sg_approach} />
              <Pill label="Short" value={round.sg_short} />
              <Pill label="Putting" value={round.sg_putting} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <DeleteRoundButton id={roundId} />
          <Link href="/rounds" className="underline">
            Back to rounds
          </Link>
        </div>
      </div>

      {/* Edit form (score, holes, SG components/total) */}
      <div className="rounded-2xl border p-4">
        <div className="font-semibold mb-2">Edit Round</div>
        <EditRoundForm round={round} />
      </div>

      {/* Hole-by-hole editor (kept from your version) */}
      <div className="rounded-2xl border p-4">
        <div className="font-semibold mb-2">Hole-by-hole</div>
        <HoleEditor roundId={roundId} existing={holes ?? []} />
        {holesErr && (
          <div className="text-sm text-red-600 mt-2">
            Failed to load holes: {holesErr.message}
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number | null }) {
  const v = typeof value === 'number' ? value : null;
  const cls = v == null ? '' : v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : '';
  return (
    <span className={`rounded-full border px-3 py-1 ${cls}`}>
      {label}: {v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
    </span>
  );
}
