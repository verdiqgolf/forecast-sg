import OpenAI from "openai";
import { NextResponse } from "next/server";

// Use Node runtime so we can run the OpenAI SDK normally
export const runtime = "nodejs";

export async function GET() {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: "Return the word 'Verdiq'." }
      ],
    });

    return NextResponse.json({
      ok: true,
      message: result.choices[0].message.content,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}
