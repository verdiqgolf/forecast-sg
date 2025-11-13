// apps/web/src/app/api/rounds/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// optional: ensure this route is always dynamic
export const dynamic = 'force-dynamic';

function getIdFromContext(req: Request, params?: { id?: string }) {
  // prefer Next.js params first
  let id = params?.id;
  if (!id) {
    // fallback: parse from URL path
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean); // ["api","rounds","<id>"]
    id = parts[parts.length - 1];
  }
  return id;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * DELETE /api/rounds/:id
 */
export async function DELETE(
  req: Request,
  ctx: { params: { id?: string } }
) {
  const id = getIdFromContext(req, ctx.params);
  console.log('[DELETE] /api/rounds/:id ->', ctx.params, 'resolved id:', id);

  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from('rounds').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/rounds/:id
 * Partial update with optional auto-calc of strokes_gained_total.
 */
export async function PATCH(
  req: Request,
  ctx: { params: { id?: string } }
) {
  const id = getIdFromContext(req, ctx.params);
  console.log('[PATCH] /api/rounds/:id ->', ctx.params, 'resolved id:', id);

  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
  }

  const supabase = await supabaseServer();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updatable = [
    'date_played',
    'course_name',
    'hole_count',
    'score',
    'strokes_gained_total',
    'sg_offtee',
    'sg_approach',
    'sg_short',
    'sg_putting',
  ] as const;

  const payload: Record<string, any> = {};
  for (const k of updatable) if (k in body) payload[k] = body[k];

  // Validate hole_count if present
  if (
    payload.hole_count != null &&
    payload.hole_count !== 9 &&
    payload.hole_count !== 18
  ) {
    return NextResponse.json({ error: 'hole_count must be 9 or 18' }, { status: 400 });
  }

  // Auto-calc total if components provided but total omitted
  const compKeys = ['sg_offtee', 'sg_approach', 'sg_short', 'sg_putting'] as const;
  const anyComps = compKeys.some((k) => k in payload);
  const totalProvided = 'strokes_gained_total' in payload;

  if (anyComps && !totalProvided) {
    const sum = compKeys
      .map((k) => {
        const v = Number(payload[k] ?? 0);
        return Number.isFinite(v) ? v : 0;
        })
      .reduce((a, b) => a + b, 0);
    payload.strokes_gained_total = Number(sum.toFixed(1));
  }

  const { error } = await supabase.from('rounds').update(payload).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
