export const revalidate = 0;

// app/dashboard/page.tsx
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import SGTrendChart from './partials/SGTrendChart';
import ScoreTrendChart from './partials/ScoreTrendChart';
import FilterBar from './partials/FilterBar';
import SGPhaseChart from './partials/SGPhaseChart';

type Search = {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  course?: string;
  holes?: '9' | '18' | 'all';
};

type Round = {
  id: string;
  date_played: string;
  score: number | null;
  strokes_gained_total: number | null;
  course_name: string | null;
  hole_count?: number | null;
  sg_offtee: number | null;
  sg_approach: number | null;
  sg_short: number | null;
  sg_putting: number | null;
};

function avg(nums: number[]) {
  if (!nums.length) return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
}

function rollingAvg(values: number[], window = 5) {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    out.push(Number((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2)));
  }
  return out;
}

export default async function DashboardPage({
  searchParams,
}: {
  // Next.js 15+ exposes searchParams as a Promise in server components
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const params: Search = {
    from: typeof sp.from === 'string' ? sp.from : undefined,
    to: typeof sp.to === 'string' ? sp.to : undefined,
    course:
      typeof sp.course === 'string' && sp.course.trim()
        ? sp.course.trim()
        : undefined,
    holes:
      sp.holes === '9' || sp.holes === '18'
        ? (sp.holes as '9' | '18')
        : 'all',
  };

  // Pull rounds (including hole_count so we can filter 9 vs 18)
  let query = supabase
    .from('rounds')
    .select(
      `id, date_played, score, strokes_gained_total, course_name,
       sg_offtee, sg_approach, sg_short, sg_putting,
       hole_count`
    )
    .order('date_played', { ascending: true });

  if (params.from) query = query.gte('date_played', params.from);
  if (params.to) query = query.lte('date_played', params.to);
  if (params.course) query = query.ilike('course_name', `%${params.course}%`);

  const { data: raw, error } = await query;

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-red-600 mt-4">{error.message}</p>
      </div>
    );
  }

  const rounds: Round[] = (raw ?? []) as unknown as Round[];

  const filtered =
    params.holes === 'all'
      ? rounds
      : rounds.filter((r) => (params.holes === '9' ? r.hole_count === 9 : r.hole_count === 18));

  const scores = filtered
    .map((r) => (typeof r.score === 'number' ? r.score : null))
    .filter((x): x is number => x !== null);

  const sgs = filtered
    .map((r) => (typeof r.strokes_gained_total === 'number' ? r.strokes_gained_total : null))
    .filter((x): x is number => x !== null);

  const avgScore = avg(scores);
  const avgSG = avg(sgs);
  const bestSG = sgs.length ? Math.max(...sgs) : null;
  const worstSG = sgs.length ? Math.min(...sgs) : null;

  // Badges
  const personalBestScore = scores.length ? Math.min(...scores) : null;
  const pbRound =
    personalBestScore != null ? filtered.find((r) => r.score === personalBestScore) : null;

  const positiveStreak = (() => {
    // count latest consecutive rounds with SG > 0
    const seq = filtered
      .map((r) => (typeof r.strokes_gained_total === 'number' ? r.strokes_gained_total : null))
      .filter((x): x is number => x !== null);
    let c = 0;
    for (let i = seq.length - 1; i >= 0; i--) {
      if (seq[i] > 0) c++;
      else break;
    }
    return c;
  })();

  // Chart data: SG trend
  const chartSG = filtered
    .filter((r) => r.strokes_gained_total != null)
    .map((r) => ({
      id: r.id,
      x: new Date(r.date_played).toLocaleDateString(),
      sg: r.strokes_gained_total as number,
    }));

  const sgSeries = chartSG.map((d) => d.sg);
  const sgRolling = rollingAvg(sgSeries, 5);

  // Chart data: Score trend
  const chartScore = filtered
    .filter((r) => r.score != null)
    .map((r) => ({
      id: r.id,
      x: new Date(r.date_played).toLocaleDateString(),
      score: r.score as number,
    }));

  // SG component series (per round)
  const chartBreakdown = filtered.map((r) => ({
    x: new Date(r.date_played).toLocaleDateString(),
    offtee: r.sg_offtee ?? 0,
    approach: r.sg_approach ?? 0,
    short: r.sg_short ?? 0,
    putting: r.sg_putting ?? 0,
    total: r.strokes_gained_total ?? 0,
  }));

  const recent = [...filtered].slice(-10).reverse();

  // Collect unique course names for filter suggestions
  const courses = Array.from(
    new Set((filtered.map((r) => r.course_name).filter(Boolean) as string[]).sort())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/rounds" className="rounded-2xl px-4 py-2 border hover:bg-gray-50">
            Rounds
          </Link>
          <a
            href={`/api/export/rounds?from=${params.from ?? ''}&to=${params.to ?? ''}&course=${
              params.course ?? ''
            }&holes=${params.holes ?? 'all'}`}
            className="rounded-2xl px-4 py-2 border hover:bg-gray-50"
          >
            Export CSV
          </a>
        </div>
      </div>

      <FilterBar
        seedCourses={courses}
        defaults={{
          from: params.from ?? '',
          to: params.to ?? '',
          course: params.course ?? '',
          holes: params.holes ?? 'all',
        }}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Rounds" value={String(filtered.length)} />
        <Kpi label="Avg Score" value={avgScore != null ? String(avgScore) : '—'} />
        <Kpi
          label="Avg SG"
          value={avgSG != null ? `${avgSG > 0 ? '+' : ''}${avgSG.toFixed(2)}` : '—'}
          tone={avgSG != null ? (avgSG > 0 ? 'good' : avgSG < 0 ? 'bad' : 'neutral') : 'neutral'}
        />
        <Kpi
          label="Best / Worst SG"
          value={
            bestSG != null && worstSG != null
              ? `${bestSG > 0 ? '+' : ''}${bestSG.toFixed(2)} / ${worstSG.toFixed(2)}`
              : '—'
          }
        />
      </div>

      {/* Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Badge
          title="Personal Best Score"
          value={personalBestScore != null ? String(personalBestScore) : '—'}
          subtitle={pbRound ? new Date(pbRound.date_played).toLocaleDateString() : ''}
        />
        <Badge title="Positive SG Streak" value={`${positiveStreak}`} subtitle="current rounds" />
        <Badge
          title="Rounds Logged"
          value={`${filtered.length}`}
          subtitle={`${params.holes === 'all' ? '' : params.holes + '-hole '}period`}
        />
      </div>

      {/* Charts */}
      <div className="rounded-2xl border p-4 space-y-6">
        <div>
          <div className="font-semibold mb-2">Strokes Gained (trend)</div>
          {/* If your SGTrendChart expects `data`, keep this; if it expects `points`, map accordingly */}
          <SGTrendChart data={chartSG.map((d, i) => ({ ...d, sgAvg: sgRolling[i] ?? d.sg }))} />
        </div>

        {/* new components trend */}
        <div className="pt-2 border-t">
          <div className="font-semibold mb-2">SG by Component (per round)</div>
          <SGPhaseChart data={chartBreakdown} />
        </div>

        <div className="pt-2 border-t">
          <div className="font-semibold mb-2">Score vs Date</div>
          <ScoreTrendChart data={chartScore} />
        </div>
      </div>

      {/* Recent rounds */}
      <div className="rounded-2xl border">
        <div className="p-4 font-semibold">Recent Rounds</div>
        <div className="border-t">
          <div className="grid grid-cols-4 px-4 py-2 text-sm font-medium opacity-70">
            <div>Date</div>
            <div>Course</div>
            <div>Score</div>
            <div>SG (total)</div>
          </div>
          <div className="divide-y">
            {recent.length ? (
              recent.map((r) => (
                <Link
                  key={r.id}
                  href={`/rounds/${r.id}`}
                  className="grid grid-cols-4 px-4 py-3 hover:bg-gray-50"
                >
                  <div>{new Date(r.date_played).toLocaleDateString()}</div>
                  <div className="truncate">{r.course_name ?? '—'}</div>
                  <div>{r.score ?? '—'}</div>
                  <div
                    className={
                      Number(r.strokes_gained_total ?? 0) > 0
                        ? 'text-green-700'
                        : Number(r.strokes_gained_total ?? 0) < 0
                        ? 'text-red-700'
                        : ''
                    }
                  >
                    {r.strokes_gained_total != null
                      ? `${r.strokes_gained_total > 0 ? '+' : ''}${r.strokes_gained_total.toFixed(
                          2
                        )}`
                      : '—'}
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-4 py-6 text-sm opacity-70">No rounds in this view.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  const toneClass =
    tone === 'good' ? 'text-green-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-900';
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm opacity-70">{label}</div>
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function Badge({
  title,
  value,
  subtitle = '',
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
      {subtitle ? <div className="text-xs opacity-60">{subtitle}</div> : null}
    </div>
  );
}
