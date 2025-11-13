// apps/web/src/app/api/export/rounds/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const course = searchParams.get('course') || undefined;
  const holesFilter = (searchParams.get('holes') as '9' | '18' | 'all' | null) || 'all';

  // 1) Fetch rounds (filtered)
  let q = supabase
    .from('rounds')
    .select('id, date_played, score, strokes_gained_total, course_name')
    .order('date_played', { ascending: true });

  if (from) q = q.gte('date_played', from);
  if (to) q = q.lte('date_played', to);
  if (course) q = q.ilike('course_name', `%${course}%`);

  const { data: rounds, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2) Optional holes filter (9/18) — client-side grouping (no .group() in supabase-js)
  let ids = rounds?.map((r) => r.id) ?? [];

  if (holesFilter !== 'all' && ids.length) {
    const { data: holeRows, error: holesErr } = await supabase
      .from('holes')
      .select('round_id')
      .in('round_id', ids);

    if (holesErr)
      return NextResponse.json({ error: holesErr.message }, { status: 500 });

    const countMap = new Map<string, number>();
    for (const row of holeRows ?? []) {
      countMap.set(row.round_id, (countMap.get(row.round_id) || 0) + 1);
    }

    const want = holesFilter === '9' ? 9 : 18;
    ids = ids.filter((id) => countMap.get(id) === want);
  }

  const finalRounds = rounds.filter((r) => ids.includes(r.id));

  // 3) Fetch holes for those rounds
  const { data: holes, error: holesErr2 } = await supabase
    .from('holes')
    .select(
      'round_id, number, par, strokes, notes, start_lie, start_distance_y, end_lie, end_distance_y, putts, sg_true'
    )
    .in('round_id', ids)
    .order('round_id', { ascending: true })
    .order('number', { ascending: true });

  if (holesErr2)
    return NextResponse.json({ error: holesErr2.message }, { status: 500 });

  // 4) Build CSV
  const header =
    'round_id,date_played,course_name,score,strokes_gained_total,hole,par,strokes,putts,start_lie,start_y,end_lie,end_y,sg_true,notes';
  const lines: string[] = [header];

  for (const r of finalRounds) {
    const hs = (holes ?? []).filter((h) => h.round_id === r.id);
    if (!hs.length) {
      lines.push(
        [
          r.id,
          r.date_played,
          qStr(r.course_name),
          r.score ?? '',
          r.strokes_gained_total ?? '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(',')
      );
    } else {
      for (const h of hs) {
        lines.push(
          [
            r.id,
            r.date_played,
            qStr(r.course_name),
            r.score ?? '',
            r.strokes_gained_total ?? '',
            h.number ?? '',
            h.par ?? '',
            h.strokes ?? '',
            h.putts ?? '',
            h.start_lie ?? '',
            h.start_distance_y ?? '',
            h.end_lie ?? '',
            h.end_distance_y ?? '',
            h.sg_true ?? '',
            qStr(h.notes),
          ].join(',')
        );
      }
    }
  }

  const csv = lines.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="verdiq-rounds.csv"',
    },
  });
}

function qStr(s: any) {
  if (s == null) return '';
  const txt = String(s).replace(/"/g, '""');
  return `"${txt}"`;
}
