import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // minimal validation
    const required = ["course_name", "date_played", "score"];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === "")
        return NextResponse.json({ error: `Missing ${k}` }, { status: 400 });
    }

    const payload = {
      course_name: String(body.course_name),
      date_played: String(body.date_played), // YYYY-MM-DD
      score: Number(body.score),
      strokes_gained_total: body.strokes_gained_total ? Number(body.strokes_gained_total) : null,
      strokes_gained_tee: body.strokes_gained_tee ? Number(body.strokes_gained_tee) : null,
      strokes_gained_approach: body.strokes_gained_approach ? Number(body.strokes_gained_approach) : null,
      strokes_gained_short: body.strokes_gained_short ? Number(body.strokes_gained_short) : null,
      strokes_gained_putting: body.strokes_gained_putting ? Number(body.strokes_gained_putting) : null,
    };

    const { data, error } = await supabase
      .from("rounds")
      .insert(payload)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
