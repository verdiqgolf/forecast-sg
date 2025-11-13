import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseServer, supabaseService } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    //
    // 0) RLS client just to read user identity
    //
    const sb = supabaseServer();

    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    //
    // 1) Read JSON body
    //
    const body = await req.json();
    const path: string | undefined = body?.path;

    if (!path) {
      return NextResponse.json(
        { ok: false, error: 'Missing storage path.' },
        { status: 400 },
      );
    }

    //
    // 2) Create signed URL from storage bucket "recordings"
    //
    const { data: signed, error: signErr } = await sb
      .storage
      .from('verdiq-audio')
      .createSignedUrl(path, 60);

    if (signErr || !signed?.signedUrl) {
      console.error(signErr);
      return NextResponse.json(
        { ok: false, error: 'Could not create signed URL for audio.' },
        { status: 500 },
      );
    }

    const audioRes = await fetch(signed.signedUrl);
    if (!audioRes.ok) {
      return NextResponse.json(
        { ok: false, error: 'Failed to download audio from Storage.' },
        { status: 500 },
      );
    }

    const audioArrayBuffer = await audioRes.arrayBuffer();
    const audioFile = new File([audioArrayBuffer], 'verdiq-audio.webm', {
      type: 'audio/webm',
    });

    //
    // 3) Transcribe with OpenAI
    //
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-mini-transcribe',
    });

    const transcriptText =
      (transcription as any).text ??
      (transcription as any).output ??
      '';

    if (!transcriptText) {
      return NextResponse.json(
        { ok: false, error: 'Transcription returned empty text.' },
        { status: 500 },
      );
    }

    //
    // 4) Use SERVICE client for inserts (bypasses RLS)
    //
    const admin = supabaseService();

    // Insert recording row
    const { data: recRow, error: recErr } = await admin
      .from('recordings')
      .insert({
        user_id: user.id,
        path,
      })
      .select('id')
      .single();

    if (recErr || !recRow) {
      console.error(recErr);
      return NextResponse.json(
        { ok: false, error: 'Failed to create recording row.' },
        { status: 500 },
      );
    }

    const recordingId = recRow.id as string;

    //
    // 5) Insert transcript (service client)
    //
    const { error: transErr } = await admin.from('transcripts').insert({
      recording_id: recordingId,
      text: transcriptText,
      model: 'gpt-4o-mini-transcribe',
    });

    if (transErr) {
      console.error(transErr);
      return NextResponse.json(
        { ok: false, error: 'Failed to insert transcript.' },
        { status: 500 },
      );
    }

    //
    // 6) Parse structured intent with OpenAI (chat model)
    //
    const systemPrompt = `
You are Verdiq's golf voice parser.

Return STRICT JSON:
{
  "intent": "log_shot" | "set_pin" | "set_wind" | "ask_advice" | "note",
  "confidence": number,
  "payload": {}
}

If unsure, use intent="note".
`;

    const userPrompt = `Transcript: """${transcriptText}"""`;

    const intentResp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const rawContent = intentResp.choices[0].message.content ?? '{}';

    let parsedIntent: { intent?: string; confidence?: number; payload?: any };

    try {
      parsedIntent = JSON.parse(rawContent);
    } catch {
      parsedIntent = {
        intent: 'note',
        confidence: 0.3,
        payload: { raw: rawContent },
      };
    }

    const intent = parsedIntent.intent ?? 'note';
    const confidence =
      typeof parsedIntent.confidence === 'number'
        ? Math.min(1, Math.max(0, parsedIntent.confidence))
        : 0.5;
    const payload = parsedIntent.payload ?? {};

    //
    // 7) Insert intent (service client)
    //
    const { error: intentErr } = await admin.from('voice_intents').insert({
      recording_id: recordingId,
      intent,
      payload,
      confidence,
    });

    if (intentErr) {
      console.error(intentErr);
      return NextResponse.json(
        { ok: false, error: 'Failed to insert intent.' },
        { status: 500 },
      );
    }

    //
    // 8) Success
    //
    return NextResponse.json({
      ok: true,
      recording_id: recordingId,
      intent,
      confidence,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unexpected error' },
      { status: 500 },
    );
  }
}
