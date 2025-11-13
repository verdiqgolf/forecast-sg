// apps/web/src/app/api/export/holes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || undefined;        // YYYY-MM-DD
  const to = searchParams.get('to') || undefined;            // YYYY-MM-DD
  const course = searchParams.get('course') || undefined;    // partial match
  const startLie = searchParams.get('start_lie') || undefined; // tee|fairway|rough|sand|recovery|green|penalty|holed
  const endLie = searchParams.get('end_lie') || undefined;

  // 1) fetch rounds (for date/course filters)
  let rq = supabase
    .from('rounds')
    .select('id, date_played, course_name')
    .order('date_played', { ascending: true });

  if (from) rq = rq.gte('date_played', from);
  if (to) rq = rq.lte('date_played', to);
  if (course) rq = rq.ilike('course_name', `%${course}%`);

  const { data: rounds, error: rErr } = await rq;
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const byId = new Map<string, { date_played: string; course_name: string | null }>();
  const roundIds = (rounds ?? []).map((r) => {
    byId.set(r.id, { date_played: r.date_played, course_name: r.course_name });
    return r.id;
  });

  // 2) fetch holes for those rounds with optional lie filters
  let hq = supabase
    .from('holes')
    .select(
      'round_id, number, par, strokes, putts, start_lie, start_distance_y, end_lie, end_distance_y, sg_true, notes'
    )
    .in('round_id', roundIds)
    .order('round_id', { ascending: true })
    .order('number', { ascending: true });

  if (startLie) hq = hq.eq('start_lie', startLie);
  if (endLie) hq = hq.eq('end_lie', endLie);

  const { data: holes, error: hErr } = await hq;
  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });

  // 3) CSV
  const header =
    'round_id,date_played,course_name,hole,par,strokes,putts,' +
    'start_lie,start_y,end_lie,end_y,sg_true,notes';
  const lines: string[] = [header];

  for (const h of holes ?? []) {
    const r = byId.get(h.round_id)!;
    lines.push(
      [
        h.round_id,
        r?.date_played ?? '',
        qStr(r?.course_name ?? ''),
        h.number ?? '',
        h.par ?? '',
        h.strokes ?? '',
        h.putts ?? '',
        h.start_lie ?? '',
        h.start_distance_y ?? '',
        h.end_lie ?? '',
        h.end_distance_y ?? '',
        h.sg_true ?? '',
        qStr(h.notes ?? ''),
      ].join(',')
    );
  }

  const csv = lines.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="verdiq-holes.csv"',
    },
  });
}

function qStr(s: any) {
  const txt = String(s ?? '').replace(/"/g, '""');
  return `"${txt}"`;
}
